import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const isGroupId = (value: string): boolean => {
  return value.includes("@g.us") || value.includes("-");
};

const normalizePhone = (value: string): string => {
  const trimmed = value.trim();
  if (isGroupId(trimmed)) {
    return trimmed.split("@")[0] ?? "";
  }
  const base = trimmed.split("@")[0] ?? "";
  return base.replace(/\D/g, "") || base;
};

const normalizeBrazilianPhone = (phone: string): string => {
  if (phone.includes("-")) return phone;
  const d = phone.replace(/\D/g, "");
  // 13 digits starting with 55 + DDD + 9xxxx -> remove the extra 9
  if (d.length === 13 && d.startsWith("55")) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    if (rest.startsWith("9") && rest.length === 9) {
      return `55${ddd}${rest.slice(1)}`;
    }
  }
  return d;
};

const safeJson = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const resolvePhoneFromLid = async (
  supabase: ReturnType<typeof createClient>,
  lid: string,
): Promise<string | null> => {
  const lidValue = lid.trim();
  if (!lidValue.includes("@lid")) return null;

  const { data: settings } = await supabase
    .from("zapi_settings")
    .select("instance_id, token, client_token")
    .limit(1)
    .maybeSingle();

  if (!settings?.instance_id || !settings?.token) return null;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.client_token) headers["Client-Token"] = settings.client_token;

  const chatsRes = await fetch(
    `https://api.z-api.io/instances/${settings.instance_id}/token/${settings.token}/chats`,
    { headers },
  );
  const chatsPayload = await safeJson(chatsRes);
  const chatList = Array.isArray(chatsPayload)
    ? chatsPayload
    : (chatsPayload?.chats || chatsPayload?.data || []);

  if (!Array.isArray(chatList)) return null;

  const chat = chatList.find((item: any) => {
    const itemLid = item?.lid || item?.chatLid || "";
    const itemPhone = item?.phone || item?.chatId || item?.waId || "";
    return typeof itemLid === "string" && itemLid === lidValue && typeof itemPhone === "string" && itemPhone.length > 0;
  });

  if (!chat?.phone) return null;
  const resolved = normalizeBrazilianPhone(normalizePhone(chat.phone));
  if (!resolved || resolved.replace(/\D/g, "").length >= 15) return null;
  return resolved;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    console.log('Z-API Webhook received:', JSON.stringify(payload));

    // Determine event type
    const isMessage = payload.phone && (payload.text || payload.image || payload.audio || payload.document || payload.video || payload.buttonsResponseMessage || payload.listResponseMessage || payload.buttonMessage);
    const isStatus = payload.type === 'DeliveryCallback' || payload.type === 'MessageStatusCallback';
    const isConnection = payload.connected !== undefined;

    if (isMessage) {
      const rawPhone = payload.phone || '';
      const chatIsGroup = isGroupId(rawPhone);
      const rawNormalized = normalizePhone(rawPhone);
      const rawDigits = rawNormalized.replace(/\D/g, '');

      // Resolve LID chats to real phone whenever possible
      let phone = chatIsGroup
        ? rawNormalized
        : normalizeBrazilianPhone(rawNormalized);

      if (!chatIsGroup && rawPhone.includes('@lid')) {
        const resolvedPhone = await resolvePhoneFromLid(supabase, rawPhone);
        if (resolvedPhone) {
          phone = resolvedPhone;

          // Backfill old LID messages/contacts so historical chat appears in the right thread
          if (rawDigits.length >= 15) {
            await supabase.from('zapi_messages').update({ phone: resolvedPhone }).eq('phone', rawDigits);
            await supabase.from('zapi_contacts').delete().eq('phone', rawDigits);
          }
        }
      }

      // If still unresolved LID, skip to avoid duplicate fake contacts
      const phoneDigits = phone.replace(/\D/g, '');
      if (!chatIsGroup && phoneDigits.length >= 15) {
        console.log('Skipping unresolved LID contact:', phone);
        return new Response(JSON.stringify({ success: true, skipped: 'lid_unresolved' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const senderName = payload.senderName || payload.chatName || phone;
      
      let messageType = 'text';
      let content = payload.text?.message || payload.text || '';
      let mediaUrl = null;
      let metadata = null;

      if (payload.image) {
        messageType = 'image';
        mediaUrl = payload.image.imageUrl || payload.image.url;
        content = payload.image.caption || '';
      } else if (payload.audio) {
        messageType = 'audio';
        mediaUrl = payload.audio.audioUrl || payload.audio.url;
      } else if (payload.document) {
        messageType = 'document';
        mediaUrl = payload.document.documentUrl || payload.document.url;
        content = payload.document.fileName || '';
      } else if (payload.video) {
        messageType = 'video';
        mediaUrl = payload.video.videoUrl || payload.video.url;
        content = payload.video.caption || '';
      } else if (payload.buttonsResponseMessage) {
        messageType = 'button_response';
        // Z-API sends buttonId and message fields (not selectedDisplayText/selectedButtonId)
        const btnMessage = payload.buttonsResponseMessage.message || '';
        const btnId = payload.buttonsResponseMessage.buttonId || '';
        // Fallback to legacy field names for compatibility
        const btnDisplayText = payload.buttonsResponseMessage.selectedDisplayText || payload.buttonsResponseMessage.selectedButtonText || '';
        const legacyId = payload.buttonsResponseMessage.selectedButtonId || '';
        content = btnMessage || btnDisplayText || btnId || legacyId || 'Botão selecionado';
        console.log(`[Webhook] Button response: message="${btnMessage}", buttonId="${btnId}", content="${content}"`);
        metadata = {
          selectedButtonId: btnId || legacyId || '',
          selectedDisplayText: btnMessage || btnDisplayText || '',
          selectedButtonId: btnId,
          selectedButtonText: btnDisplayText || btnId,
        };
      } else if (payload.listResponseMessage) {
        messageType = 'button_response';
        content = payload.listResponseMessage.title || '';
        metadata = {
          selectedButtonId: payload.listResponseMessage.listType?.toString(),
          selectedButtonText: payload.listResponseMessage.title || content,
        };
      } else if (payload.buttonMessage) {
        messageType = 'buttons';
        content = payload.buttonMessage.message || payload.buttonMessage.contentText || '';
        metadata = {
          buttons: (payload.buttonMessage.buttons || []).map((b: any) => ({
            id: b.buttonId || b.id || '',
            label: b.buttonText?.displayText || b.label || b.buttonId || '',
          })),
          title: payload.buttonMessage.title || null,
          footer: payload.buttonMessage.footerText || null,
        };
      }

      // If content is an object (e.g. {message: "text"}), extract the string
      if (typeof content === 'object' && content !== null) {
        content = (content as any).message || JSON.stringify(content);
      }

      const direction = payload.fromMe ? 'outgoing' : 'incoming';
      const messageId = payload.messageId || payload.zaapId || null;

      // Idempotency: same webhook message must be processed only once
      if (messageId) {
        const { data: existingMessage } = await supabase
          .from('zapi_messages')
          .select('id')
          .eq('message_id', messageId)
          .limit(1)
          .maybeSingle();

        if (existingMessage) {
          console.log(`[Webhook] Duplicate message ignored: ${messageId}`);
          return new Response(JSON.stringify({ success: true, skipped: 'duplicate_message' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Save message
      const { error: msgError } = await supabase.from('zapi_messages').insert({
        message_id: messageId,
        phone,
        contact_name: senderName,
        direction,
        message_type: messageType,
        content,
        media_url: mediaUrl,
        metadata,
        status: direction === 'incoming' ? 'received' : 'sent',
        is_read: direction === 'outgoing',
        timestamp: payload.momment || payload.timestamp || Date.now(),
      });

      if (msgError) {
        console.error('Error saving message:', msgError);
      }

      // Upsert contact
      const contactData: Record<string, unknown> = {
        phone,
        name: senderName,
        is_group: chatIsGroup,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (direction === 'incoming') {
        const { data: existingContact } = await supabase
          .from('zapi_contacts')
          .select('unread_count')
          .eq('phone', phone)
          .single();

        contactData.unread_count = (existingContact?.unread_count || 0) + 1;
      }

      await supabase.from('zapi_contacts').upsert(contactData, { onConflict: 'phone' });

      // --- Flow handling on incoming messages ---
      if (direction === 'incoming' && typeof content === 'string' && content.trim().length > 0) {
        const contentLower = content.toLowerCase().trim();

        // First priority: if there is a paused execution (wait for reply), resume it
        const { data: pausedExec } = await supabase
          .from('zapi_flow_executions')
          .select('id')
          .eq('phone', phone)
          .eq('status', 'paused')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        if (pausedExec?.id) {
          console.log(`[Webhook] Resuming paused flow execution ${pausedExec.id} for ${phone}`);

          fetch(`${supabaseUrl}/functions/v1/zapi-proxy`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey,
            },
            body: JSON.stringify({
              action: 'resume-execution',
              data: { executionId: pausedExec.id, phone },
            }),
          }).catch(err => console.error('[Webhook] Flow resume error:', err));
        } else {
          // If no paused execution, check running (don't stack flows)
          const { data: runningExec } = await supabase
            .from('zapi_flow_executions')
            .select('id')
            .eq('phone', phone)
            .eq('status', 'running')
            .limit(1)
            .maybeSingle();

          if (!runningExec) {
            let matchedFlowId: string | null = null;

            // 1) Check first_message flows - only if contact has NO previous messages
            const { data: firstMsgFlows } = await supabase
              .from('zapi_flows')
              .select('id')
              .eq('is_active', true)
              .eq('trigger_type', 'first_message');

            if (firstMsgFlows && firstMsgFlows.length > 0) {
              // Count previous incoming messages from this phone (excluding the one we just saved)
              const { count: previousMsgCount } = await supabase
                .from('zapi_messages')
                .select('id', { count: 'exact', head: true })
                .eq('phone', phone)
                .eq('direction', 'incoming');

              // If this is the first incoming message (count === 1, the one we just inserted)
              if (previousMsgCount !== null && previousMsgCount <= 1) {
                matchedFlowId = firstMsgFlows[0].id;
                console.log(`[Webhook] First message detected! Triggering flow ${matchedFlowId} for ${phone}`);
              }
            }

            // 2) Check keyword flows if no first_message match
            if (!matchedFlowId) {
              const { data: keywordFlows } = await supabase
                .from('zapi_flows')
                .select('id, trigger_keywords, trigger_specific_text')
                .eq('is_active', true)
                .eq('trigger_type', 'keyword');

              if (keywordFlows && keywordFlows.length > 0) {
                for (const flow of keywordFlows) {
                  if (flow.trigger_specific_text && flow.trigger_specific_text.trim().length > 0) {
                    if (contentLower !== flow.trigger_specific_text.toLowerCase().trim()) continue;
                  }

                  const keywords: string[] = Array.isArray(flow.trigger_keywords) ? flow.trigger_keywords : [];
                  if (keywords.length === 0) continue;

                  const matched = keywords.some((kw: string) => contentLower.includes(kw.toLowerCase().trim()));
                  if (matched) {
                    matchedFlowId = flow.id;
                    break;
                  }
                }
              }
            }

            // 3) Prevent duplicate: check if this flow already ran for this phone
            if (matchedFlowId) {
              const { data: alreadyRan } = await supabase
                .from('zapi_flow_executions')
                .select('id')
                .eq('phone', phone)
                .eq('flow_id', matchedFlowId)
                .in('status', ['completed', 'running', 'paused'])
                .limit(1)
                .maybeSingle();

              if (alreadyRan) {
                console.log(`[Webhook] Flow ${matchedFlowId} already executed for ${phone}, skipping duplicate`);
                matchedFlowId = null;
              }
            }

            if (matchedFlowId) {
              console.log(`[Webhook] Triggering flow ${matchedFlowId} for ${phone}`);

              fetch(`${supabaseUrl}/functions/v1/zapi-proxy`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${serviceKey}`,
                  'apikey': serviceKey,
                },
                body: JSON.stringify({
                  action: 'execute-flow',
                  data: { flowId: matchedFlowId, phone },
                }),
              }).catch(err => console.error('[Webhook] Flow trigger error:', err));
            }
          } else {
            console.log(`[Webhook] Skipping keyword trigger - already running flow for ${phone}`);
          }
        }
      }
    }

    if (isStatus && payload.messageId) {
      let status = 'sent';
      if (payload.status === 'RECEIVED' || payload.status === 'DELIVERED') status = 'delivered';
      if (payload.status === 'READ') status = 'read';

      await supabase
        .from('zapi_messages')
        .update({ status })
        .eq('message_id', payload.messageId);
    }

    if (isConnection) {
      await supabase
        .from('zapi_settings')
        .update({ 
          is_connected: payload.connected,
          updated_at: new Date().toISOString()
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Z-API webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
