import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SQUARE_API_URL = "https://dashboardmroinstagramvini-online.squareweb.app";

const log = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ESTRUTURA-TRIALS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, mro_username, mro_password, instagram_username, client_name, client_whatsapp, client_email } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!mro_username) {
      return new Response(
        JSON.stringify({ success: false, message: 'Usuário MRO não informado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ── LIST TRIALS ──
    if (action === 'list') {
      log("Listing trials", { mro_username });

      // Get trial settings for limits
      const { data: settings } = await supabase
        .from('free_trial_settings')
        .select('trial_duration_hours')
        .limit(1)
        .single();

      const trialHours = settings?.trial_duration_hours || 6;

      // Get all trials for this MRO user
      const { data: trials, error } = await supabase
        .from('free_trial_registrations')
        .select('*')
        .eq('mro_master_user', mro_username)
        .order('created_at', { ascending: false });

      if (error) {
        log("Error fetching trials", { error });
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao carregar testes' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Count trials in last 30 days
      const trialsLast30Days = (trials || []).filter(t => new Date(t.created_at) > thirtyDaysAgo).length;
      const maxTrials = 5; // Default max per 30 days

      // Map trials with status
      const mappedTrials = (trials || []).map(t => {
        const expiresAt = new Date(t.expires_at);
        const isExpired = now > expiresAt;
        const isRemoved = t.instagram_removed === true;
        
        let status = 'active';
        if (isExpired || isRemoved) status = 'expired';

        // Calculate remaining time
        let remainingMs = expiresAt.getTime() - now.getTime();
        if (remainingMs < 0) remainingMs = 0;
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          id: t.id,
          instagram_username: t.instagram_username,
          full_name: t.full_name,
          email: t.email,
          whatsapp: t.whatsapp,
          created_at: t.created_at,
          expires_at: t.expires_at,
          status,
          remaining_hours: remainingHours,
          remaining_minutes: remainingMinutes,
          instagram_removed: t.instagram_removed,
        };
      });

      return new Response(
        JSON.stringify({
          success: true,
          trials: mappedTrials,
          total_generated: (trials || []).length,
          trials_last_30_days: trialsLast30Days,
          trials_remaining: Math.max(0, maxTrials - trialsLast30Days),
          max_trials: maxTrials,
          trial_duration_hours: trialHours,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── CREATE TRIAL ──
    if (action === 'create') {
      if (!instagram_username || !mro_password) {
        return new Response(
          JSON.stringify({ success: false, message: 'Instagram e senha MRO são obrigatórios' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const normalizedIG = instagram_username.toLowerCase().replace(/^@/, '').trim();

      if (normalizedIG.length < 1 || !/^[a-zA-Z0-9._]+$/.test(normalizedIG)) {
        return new Response(
          JSON.stringify({ success: false, message: 'Nome de Instagram inválido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check if this Instagram was already tested
      const { data: existingTrial } = await supabase
        .from('free_trial_registrations')
        .select('id, registered_at')
        .eq('instagram_username', normalizedIG)
        .single();

      if (existingTrial) {
        return new Response(
          JSON.stringify({
            success: false,
            alreadyTested: true,
            message: `Este Instagram já foi usado para teste em ${new Date(existingTrial.registered_at).toLocaleString('pt-BR')}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check 30-day limit
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { count } = await supabase
        .from('free_trial_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('mro_master_user', mro_username)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const maxTrials = 5;
      if ((count || 0) >= maxTrials) {
        return new Response(
          JSON.stringify({ success: false, message: `Limite de ${maxTrials} testes por 30 dias atingido` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get trial settings
      const { data: settings } = await supabase
        .from('free_trial_settings')
        .select('trial_duration_hours')
        .limit(1)
        .single();

      const trialHours = settings?.trial_duration_hours || 6;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + trialHours);

      // Add Instagram to MRO account via SquareCloud API
      log("Adding Instagram to MRO account", { mro_username, instagram: normalizedIG });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const addIgResponse = await fetch(`${SQUARE_API_URL}/adicionar-instagram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: mro_username,
            igInstagram: normalizedIG
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await addIgResponse.text();
        let addIgResult;
        try {
          addIgResult = JSON.parse(responseText);
        } catch {
          return new Response(
            JSON.stringify({ success: false, message: 'Resposta inválida do servidor de automação' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        if (!addIgResult.success) {
          return new Response(
            JSON.stringify({ success: false, message: addIgResult.message || 'Erro ao adicionar Instagram' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (apiError: any) {
        const errorMessage = apiError.name === 'AbortError'
          ? 'Tempo limite excedido. Servidor de automação demorando.'
          : 'Erro ao conectar com o servidor de automação.';
        return new Response(
          JSON.stringify({ success: false, message: errorMessage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Save to database
      const { error: insertError } = await supabase
        .from('free_trial_registrations')
        .insert({
          full_name: client_name || 'Cliente Teste',
          email: (client_email || `${normalizedIG}@teste.mro`).toLowerCase(),
          whatsapp: client_whatsapp || '00000000000',
          instagram_username: normalizedIG,
          generated_username: mro_username,
          generated_password: mro_password,
          mro_master_user: mro_username,
          expires_at: expiresAt.toISOString(),
          email_sent: false,
          instagram_removed: false,
        });

      if (insertError) {
        log("Insert error", { error: insertError });
        // Rollback: remove Instagram
        try {
          await fetch(`${SQUARE_API_URL}/remover-instagram`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: mro_username, instagram: normalizedIG })
          });
        } catch {}
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao salvar registro' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      log("Trial created", { instagram: normalizedIG, expires: expiresAt.toISOString() });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Teste criado com sucesso!',
          trial: {
            instagram_username: normalizedIG,
            expires_at: expiresAt.toISOString(),
            trial_duration_hours: trialHours,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Ação inválida' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    log('Error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ success: false, message: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
