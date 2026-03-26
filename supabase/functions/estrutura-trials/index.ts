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

      // Get all trials for this MRO user from Supabase
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

      // Fetch real data from SquareCloud API via /verificar-numero
      let apiRemaining: number | null = null;
      let apiTestAccounts: Record<string, any> = {};
      try {
        const body = new URLSearchParams({ nome: mro_username, numero: mro_username });
        if (mro_password) body.set('numero', mro_password);
        const checkResponse = await fetch(`${SQUARE_API_URL}/verificar-numero`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        if (checkResponse.ok) {
          const text = await checkResponse.text();
          if (!text.trim().startsWith('<!')) {
            const checkData = JSON.parse(text);
            log("SquareCloud API data", { testsRemainingMonth: checkData.userData?.testsRemainingMonth, igTesteUserMro: checkData.userData?.igTesteUserMro });
            if (typeof checkData.userData?.testsRemainingMonth === 'number') {
              apiRemaining = checkData.userData.testsRemainingMonth;
            }
            if (checkData.userData?.igTesteUserMro) {
              apiTestAccounts = checkData.userData.igTesteUserMro;
            }
          }
        }
      } catch (e) {
        log("Could not check SquareCloud API", { error: e instanceof Error ? e.message : 'Unknown' });
      }

      // Map trials with status
      const mappedTrials = (trials || []).map(t => {
        const expiresAt = new Date(t.expires_at);
        const isExpired = now > expiresAt;
        const isRemoved = t.instagram_removed === true;
        
        let status = 'active';
        if (isExpired || isRemoved) status = 'expired';

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

      // Count from Supabase as fallback
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const trialsLast30Days = (trials || []).filter(t => new Date(t.created_at) > thirtyDaysAgo).length;
      const maxTrialsFallback = 5;

      // Use API data if available
      const effectiveRemaining = apiRemaining !== null ? apiRemaining : Math.max(0, maxTrialsFallback - trialsLast30Days);
      const totalGenerated = apiRemaining !== null 
        ? Object.keys(apiTestAccounts).length + (trials || []).length
        : (trials || []).length;

      return new Response(
        JSON.stringify({
          success: true,
          trials: mappedTrials,
          total_generated: (trials || []).length,
          trials_last_30_days: trialsLast30Days,
          trials_remaining: effectiveRemaining,
          max_trials: apiRemaining !== null ? (effectiveRemaining + trialsLast30Days) : maxTrialsFallback,
          trial_duration_hours: trialHours,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── CREATE TRIAL ──
    if (action === 'create') {
      if (!instagram_username) {
        return new Response(
          JSON.stringify({ success: false, message: 'Instagram é obrigatório' }),
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

      // Check how many times this Instagram was tested (allow up to 2)
      const { data: existingTrials, count: igCount } = await supabase
        .from('free_trial_registrations')
        .select('id, registered_at', { count: 'exact', head: false })
        .eq('instagram_username', normalizedIG);

      const maxPerIG = 2;
      if ((igCount || 0) >= maxPerIG) {
        return new Response(
          JSON.stringify({
            success: false,
            alreadyTested: true,
            message: `Esta página já usou ${maxPerIG} testes. Não é possível usar mais. Entre em contato com o admin.`
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

      // First, check how many tests are available from the original API
      let apiAvailable: number | null = null;
      try {
        const checkResponse = await fetch(`${SQUARE_API_URL}/contarTestesMro?nameUserMro=${encodeURIComponent(mro_username)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          log("API availability check", checkData);
          if (typeof checkData.restantes === 'number') {
            apiAvailable = checkData.restantes;
          } else if (typeof checkData.remaining === 'number') {
            apiAvailable = checkData.remaining;
          }
        }
      } catch (e) {
        log("Could not check API availability", { error: e instanceof Error ? e.message : 'Unknown' });
      }

      // Use API limit if available, otherwise fallback to local count
      const maxTrials = 5;
      const localUsed = count || 0;
      if (apiAvailable !== null && apiAvailable <= 0) {
        return new Response(
          JSON.stringify({ success: false, message: `Limite de testes atingido. Sem testes disponíveis na plataforma.` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (apiAvailable === null && localUsed >= maxTrials) {
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

      // Create 6-hour trial via SquareCloud API /criarTesteMro
      log("Creating 6h trial via /criarTesteMro", { mro_username, instagram: normalizedIG });

      let apiTrialResult: any = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const trialResponse = await fetch(`${SQUARE_API_URL}/criarTesteMro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            igAssociada: normalizedIG,
            nameUserMro: mro_username
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await trialResponse.text();
        log("API Response", { status: trialResponse.status, body: responseText.substring(0, 500) });

        try {
          apiTrialResult = JSON.parse(responseText);
        } catch {
          return new Response(
            JSON.stringify({ success: false, message: 'Resposta inválida do servidor de automação' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        if (!apiTrialResult.success) {
          return new Response(
            JSON.stringify({ success: false, message: apiTrialResult.message || 'Erro ao criar teste na plataforma' }),
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

      // Save to database - use 6 hours from API
      const trialHoursFromApi = apiTrialResult.timeLeft || trialHours;
      const apiExpiresAt = new Date();
      apiExpiresAt.setHours(apiExpiresAt.getHours() + trialHoursFromApi);

      const { error: insertError } = await supabase
        .from('free_trial_registrations')
        .insert({
          full_name: client_name || 'Cliente Teste',
          email: (client_email || `${normalizedIG}@teste.mro`).toLowerCase(),
          whatsapp: client_whatsapp || '00000000000',
          instagram_username: normalizedIG,
          generated_username: mro_username,
          generated_password: mro_password || '',
          mro_master_user: mro_username,
          expires_at: apiExpiresAt.toISOString(),
          email_sent: false,
          instagram_removed: false,
        });

      if (insertError) {
        log("Insert error", { error: insertError });
        return new Response(
          JSON.stringify({ success: false, message: 'Erro ao salvar registro' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      log("Trial created", { instagram: normalizedIG, expires: apiExpiresAt.toISOString(), timeLeft: trialHoursFromApi });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Teste de 6 horas criado com sucesso!',
          trial: {
            instagram_username: normalizedIG,
            expires_at: apiExpiresAt.toISOString(),
            trial_duration_hours: trialHoursFromApi,
            totalUserMes: apiTrialResult.totalUserMes,
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
