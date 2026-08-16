import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendRenddxExpiredEmail, renddxWhatsAppLink } from "../_shared/renddx-expired-email.ts";

/**
 * Admin do funil /renddx (plano de 30 dias).
 *
 * Responsabilidades:
 *  - listar compradores, tentativas de compra e usuários expirados;
 *  - manter o histórico das contas de Instagram usadas por cada comprador;
 *  - bloquear automaticamente quem passou dos 30 dias e enviar o e-mail de aviso.
 *
 * Autenticação: e-mail/senha do admin principal, guardados em secrets.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SOURCE = "renddx";
const LIFETIME_DAYS = 36500;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface ToolUser {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  expiration_days: number;
  expires_at: string | null;
  expired_email_sent_at: string | null;
  is_active: boolean;
  last_access: string | null;
  created_at: string;
  source: string | null;
}

const isExpired = (u: ToolUser) => {
  if (u.expiration_days >= LIFETIME_DAYS) return false;
  if (!u.expires_at) return false;
  const t = new Date(u.expires_at).getTime();
  return Number.isFinite(t) && t <= Date.now();
};

const daysRemaining = (u: ToolUser) => {
  if (u.expiration_days >= LIFETIME_DAYS) return null;
  if (!u.expires_at) return u.expiration_days;
  return Math.max(0, Math.ceil((new Date(u.expires_at).getTime() - Date.now()) / 86400000));
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // Corpo tolerante a payloads inválidos.
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse((await req.text()) || "{}");
    } catch {
      return json({ success: false, error: "payload inválido" }, 400);
    }

    const action = String(body.action || "");
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    /**
     * Rotina automática (cron diário). Não expõe dados — apenas bloqueia quem
     * passou dos 30 dias e envia o e-mail de aviso uma única vez.
     */
    if (action === "cron_process") {
      const { data: pending } = await supabase
        .from("mro_tool_users")
        .select("*")
        .eq("source", SOURCE)
        .not("expires_at", "is", null)
        .lte("expires_at", new Date().toISOString());

      let blocked = 0;
      let emailed = 0;
      for (const u of (pending || []) as ToolUser[]) {
        const updates: Record<string, unknown> = {};
        if (u.is_active) {
          updates.is_active = false;
          blocked++;
        }
        if (!u.expired_email_sent_at && u.email) {
          const sent = await sendRenddxExpiredEmail(u.email, u.name || u.username, u.username);
          if (sent) {
            updates.expired_email_sent_at = new Date().toISOString();
            emailed++;
          }
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from("mro_tool_users").update(updates).eq("id", u.id);
        }
      }
      return json({ success: true, checked: (pending || []).length, blocked, emailed });
    }

    const adminEmail = (Deno.env.get("MRO_ADMIN_EMAIL") || "").trim().toLowerCase();
    const adminPassword = Deno.env.get("MRO_ADMIN_PASSWORD") || "";

    if (!adminEmail || !adminPassword) {
      return json({ success: false, error: "admin não configurado" }, 500);
    }
    if (email !== adminEmail || password !== adminPassword) {
      return json({ success: false, error: "Credenciais inválidas" }, 401);
    }

    if (action === "login") return json({ success: true });

    /** Bloqueia expirados e envia o aviso por e-mail (uma vez por ciclo). */
    if (action === "process_expirations" || action === "list") {
      const { data: pending } = await supabase
        .from("mro_tool_users")
        .select("*")
        .eq("source", SOURCE)
        .not("expires_at", "is", null)
        .lte("expires_at", new Date().toISOString());

      for (const u of (pending || []) as ToolUser[]) {
        const updates: Record<string, unknown> = {};
        if (u.is_active) updates.is_active = false;

        if (!u.expired_email_sent_at && u.email) {
          const sent = await sendRenddxExpiredEmail(u.email, u.name || u.username, u.username);
          if (sent) updates.expired_email_sent_at = new Date().toISOString();
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("mro_tool_users").update(updates).eq("id", u.id);
        }
      }

      if (action === "process_expirations") {
        return json({ success: true, processed: (pending || []).length });
      }
    }

    if (action === "list") {
      const { data: orders } = await supabase
        .from("mro_orders")
        .select("*")
        .eq("source", SOURCE)
        .order("created_at", { ascending: false })
        .limit(1000);

      const { data: usersRaw } = await supabase
        .from("mro_tool_users")
        .select(
          "id, username, email, name, expiration_days, expires_at, expired_email_sent_at, is_active, last_access, created_at, source",
        )
        .eq("source", SOURCE)
        .order("created_at", { ascending: false })
        .limit(1000);

      const users = (usersRaw || []) as ToolUser[];

      const { data: accounts } = await supabase
        .from("mro_tool_accounts")
        .select("id, user_id, instagram_username, created_at, is_trial")
        .in("user_id", users.length ? users.map((u) => u.id) : ["00000000-0000-0000-0000-000000000000"]);

      const byUser = new Map<string, unknown[]>();
      for (const a of accounts || []) {
        const list = byUser.get((a as { user_id: string }).user_id) || [];
        list.push(a);
        byUser.set((a as { user_id: string }).user_id, list);
      }

      const enriched = users.map((u) => ({
        ...u,
        expired: isExpired(u),
        days_remaining: daysRemaining(u),
        instagram_accounts: byUser.get(u.id) || [],
      }));

      const orderList = (orders || []) as Array<{ status: string; amount: number | null }>;
      const paidOrders = orderList.filter((o) => o.status === "paid");

      return json({
        success: true,
        whatsapp_link: renddxWhatsAppLink(),
        orders: orderList,
        users: enriched,
        stats: {
          total_orders: orderList.length,
          paid: paidOrders.length,
          attempts: orderList.length - paidOrders.length,
          active_users: enriched.filter((u) => !u.expired && u.is_active).length,
          expired_users: enriched.filter((u) => u.expired).length,
          revenue: paidOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0),
        },
      });
    }

    /** Reenvio manual do aviso de expiração. */
    if (action === "send_expired_email") {
      const userId = String(body.user_id || "");
      if (!userId) return json({ success: false, error: "user_id obrigatório" }, 400);

      const { data: user } = await supabase
        .from("mro_tool_users")
        .select("id, username, name, email")
        .eq("id", userId)
        .maybeSingle();

      if (!user?.email) return json({ success: false, error: "usuário sem e-mail" }, 404);

      const sent = await sendRenddxExpiredEmail(user.email, user.name || user.username, user.username);
      if (sent) {
        await supabase
          .from("mro_tool_users")
          .update({ expired_email_sent_at: new Date().toISOString() })
          .eq("id", userId);
      }
      return json({ success: sent, error: sent ? undefined : "falha no envio do e-mail" });
    }

    /** Reativa manualmente (renovação combinada no WhatsApp). */
    if (action === "renew_user") {
      const userId = String(body.user_id || "");
      const days = Math.max(1, Math.min(3650, Number(body.days) || 30));
      if (!userId) return json({ success: false, error: "user_id obrigatório" }, 400);

      await supabase
        .from("mro_tool_users")
        .update({
          is_active: true,
          expiration_days: days,
          expires_at: new Date(Date.now() + days * 86400000).toISOString(),
          expired_email_sent_at: null,
        })
        .eq("id", userId);

      return json({ success: true });
    }

    return json({ success: false, error: "action inválida" }, 400);
  } catch (error) {
    console.error("[RENDDX-ADMIN]", String(error));
    return json({ success: false, error: String(error) }, 500);
  }
});
