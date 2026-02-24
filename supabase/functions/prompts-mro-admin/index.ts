import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Auth check
    if (action === 'login') {
      const { email, password } = await req.json();
      const { data: settings } = await supabase
        .from('prompts_mro_settings')
        .select('*')
        .single();

      if (!settings || settings.admin_email !== email || settings.admin_password !== password) {
        return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Upload ZIP and process
    if (action === 'upload-zip') {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const folders: Record<string, { image?: { name: string; data: Uint8Array; ext: string }; text?: string }> = {};

      // First pass: find root folder structure
      // ZIP might have a root folder wrapping everything
      const allPaths = Object.keys(zip.files);
      
      // Detect common root prefix
      let rootPrefix = '';
      const topLevel = new Set<string>();
      for (const path of allPaths) {
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 1) topLevel.add(parts[0]);
      }
      // If there's only one top-level folder, it's a wrapper
      if (topLevel.size === 1) {
        rootPrefix = [...topLevel][0] + '/';
      }

      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;

        // Remove root prefix if exists
        let cleanPath = path;
        if (rootPrefix && cleanPath.startsWith(rootPrefix)) {
          cleanPath = cleanPath.slice(rootPrefix.length);
        }

        const parts = cleanPath.split('/').filter(Boolean);
        if (parts.length < 2) continue; // Need at least folder/file

        const folderName = parts[0];
        const fileName = parts[parts.length - 1].toLowerCase();

        if (!folders[folderName]) folders[folderName] = {};

        // Check if image
        if (fileName.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
          const data = await zipEntry.async('uint8array');
          const ext = fileName.split('.').pop()!;
          folders[folderName].image = { name: fileName, data, ext };
        }
        // Check if text/pdf
        else if (fileName.match(/\.(txt|pdf|docx|doc)$/i)) {
          if (fileName.endsWith('.txt')) {
            const text = await zipEntry.async('string');
            folders[folderName].text = text.trim();
          } else if (fileName.endsWith('.pdf')) {
            // For PDF, just note the file name as prompt placeholder
            const text = await zipEntry.async('string');
            // Try to extract readable text from PDF (basic)
            const cleanText = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
            folders[folderName].text = cleanText.length > 10 ? cleanText.substring(0, 5000) : `Prompt: ${folderName}`;
          } else {
            // docx - try to extract text
            try {
              const docZip = await JSZip.loadAsync(await zipEntry.async('uint8array'));
              const docXml = await docZip.file('word/document.xml')?.async('string');
              if (docXml) {
                const textContent = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                folders[folderName].text = textContent;
              }
            } catch {
              folders[folderName].text = `Prompt: ${folderName}`;
            }
          }
        }
      }

      let processed = 0;
      let orderIndex = 0;

      // Get current max order_index
      const { data: existingItems } = await supabase
        .from('prompts_mro_items')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1);
      
      if (existingItems && existingItems.length > 0) {
        orderIndex = existingItems[0].order_index + 1;
      }

      for (const [folderName, content] of Object.entries(folders)) {
        if (!content.text && !content.image) continue;

        let imageUrl = null;

        // Upload image to storage
        if (content.image) {
          const storagePath = `prompts/${Date.now()}_${folderName.replace(/[^a-zA-Z0-9]/g, '_')}.${content.image.ext}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('assets')
            .upload(storagePath, content.image.data, {
              contentType: `image/${content.image.ext === 'jpg' ? 'jpeg' : content.image.ext}`,
              upsert: true,
            });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from('assets').getPublicUrl(storagePath);
            imageUrl = urlData.publicUrl;
          }
        }

        const promptText = content.text || `Prompt: ${folderName}`;

        await supabase.from('prompts_mro_items').insert({
          folder_name: folderName,
          prompt_text: promptText,
          image_url: imageUrl,
          order_index: orderIndex++,
          is_active: true,
        });

        processed++;
      }

      return new Response(JSON.stringify({ success: true, processed, total: Object.keys(folders).length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get all prompts
    if (action === 'get-prompts') {
      const { data, error } = await supabase
        .from('prompts_mro_items')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return new Response(JSON.stringify({ prompts: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Delete prompt
    if (action === 'delete-prompt') {
      const { id } = await req.json();
      await supabase.from('prompts_mro_items').delete().eq('id', id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Delete all prompts
    if (action === 'delete-all-prompts') {
      await supabase.from('prompts_mro_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Toggle prompt active
    if (action === 'toggle-prompt') {
      const { id, is_active } = await req.json();
      await supabase.from('prompts_mro_items').update({ is_active }).eq('id', id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get users
    if (action === 'get-users') {
      const { data, error } = await supabase
        .from('prompts_mro_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return new Response(JSON.stringify({ users: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Toggle user status
    if (action === 'toggle-user') {
      const { id, status } = await req.json();
      await supabase.from('prompts_mro_users').update({ status }).eq('id', id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Delete user
    if (action === 'delete-user') {
      const { id } = await req.json();
      await supabase.from('prompts_mro_users').delete().eq('id', id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
