import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Upload single image to storage
    if (action === 'upload-image') {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const folder = formData.get('folder') as string;
      
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const arrayBuffer = await file.arrayBuffer();
      const ext = file.name.split('.').pop() || 'png';
      const storagePath = `prompts/${Date.now()}_${(folder || 'img').replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, new Uint8Array(arrayBuffer), {
          contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (uploadError) {
        return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(storagePath);
      return new Response(JSON.stringify({ url: urlData.publicUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert single prompt
    if (action === 'insert-prompt') {
      const { folder_name, prompt_text, image_url, category } = await req.json();

      // Get current max order_index
      const { data: existingItems } = await supabase
        .from('prompts_mro_items')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1);
      
      let orderIndex = 0;
      if (existingItems && existingItems.length > 0) {
        orderIndex = existingItems[0].order_index + 1;
      }

      const { error } = await supabase.from('prompts_mro_items').insert({
        folder_name,
        prompt_text,
        image_url,
        order_index: orderIndex,
        is_active: true,
        category: category || 'geral',
      });

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // Update prompt text/category/folder_name
    if (action === 'update-prompt') {
      const { id, prompt_text, category, folder_name } = await req.json();
      const updates: Record<string, any> = {};
      if (prompt_text !== undefined) updates.prompt_text = prompt_text;
      if (category !== undefined) updates.category = category;
      if (folder_name !== undefined) updates.folder_name = folder_name;
      
      const { error } = await supabase.from('prompts_mro_items').update(updates).eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update prompt image
    if (action === 'update-prompt-image') {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const id = formData.get('id') as string;
      
      if (!file || !id) {
        return new Response(JSON.stringify({ error: 'Missing file or id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const arrayBuffer = await file.arrayBuffer();
      const ext = file.name.split('.').pop() || 'png';
      const storagePath = `prompts/${Date.now()}_edit_${id.slice(0, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, new Uint8Array(arrayBuffer), {
          contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
        });

      if (uploadError) {
        return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(storagePath);
      await supabase.from('prompts_mro_items').update({ image_url: urlData.publicUrl }).eq('id', id);

      return new Response(JSON.stringify({ success: true, url: urlData.publicUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    // Get orders
    if (action === 'get-orders') {
      const { data, error } = await supabase
        .from('prompts_mro_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Auto-expire pending orders past their expired_at
      const now = new Date();
      const updated = (data || []).map(order => {
        if (order.status === 'pending' && order.expired_at && new Date(order.expired_at) < now) {
          supabase.from('prompts_mro_orders').update({ status: 'expired' }).eq('id', order.id);
          return { ...order, status: 'expired' };
        }
        return order;
      });

      return new Response(JSON.stringify({ orders: updated }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mark order as paid manually + create user access
    if (action === 'mark-order-paid') {
      const { id, email, name } = await req.json();
      await supabase.from('prompts_mro_orders').update({ 
        status: 'paid', 
        paid_at: new Date().toISOString() 
      }).eq('id', id);

      // Create user access
      const { data: existing } = await supabase
        .from('prompts_mro_users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existing) {
        await supabase.from('prompts_mro_users').update({ status: 'active' }).eq('id', existing.id);
      } else {
        const password = email.split('@')[0] + '2025';
        await supabase.from('prompts_mro_users').insert({
          name: name || email.split('@')[0],
          email,
          password,
          status: 'active',
        });
      }

      await supabase.from('prompts_mro_orders').update({ 
        status: 'completed', 
        access_created: true, 
        completed_at: new Date().toISOString() 
      }).eq('id', id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Delete order
    if (action === 'delete-order') {
      const { id } = await req.json();
      await supabase.from('prompts_mro_orders').delete().eq('id', id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
