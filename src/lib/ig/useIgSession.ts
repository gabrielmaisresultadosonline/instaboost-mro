/**
 * Sessão do módulo /IG: usuário autenticado, tenants, tenant ativo,
 * papel, contas conectadas e limites do plano (entitlements centralizados).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { igApi, type IgMe, type IgPlan, type IgRole } from "./api";

const ACTIVE_TENANT_KEY = "ig_active_tenant";

export interface IgSessionState {
  loading: boolean;
  session: Session | null;
  me: IgMe | null;
  error: string | null;
  activeTenantId: string | null;
  setActiveTenantId: (tenantId: string) => void;
  reload: () => Promise<void>;
}

export function useIgSession(): IgSessionState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<IgMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTenantId, setActive] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_TENANT_KEY);
    } catch {
      return null;
    }
  });

  const setActiveTenantId = useCallback((tenantId: string) => {
    setActive(tenantId);
    try {
      localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await igApi.me();
      setMe(data);
      const validIds = data.tenants.map((t) => t.id);
      setActive((current) => {
        const next = current && validIds.includes(current) ? current : validIds[0] ?? null;
        if (next) {
          try {
            localStorage.setItem(ACTIVE_TENANT_KEY, next);
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar seus dados.");
    }
  }, []);

  useEffect(() => {
    // Listener registrado antes de qualquer leitura de sessão.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setMe(null);
        setLoading(false);
      }
    });

    (async () => {
      const { data } = await supabase.auth.getUser();
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(data.user ? sessionData.session : null);
      if (data.user) await load();
      setLoading(false);
    })();

    return () => subscription.subscription.unsubscribe();
  }, [load]);

  return { loading, session, me, error, activeTenantId, setActiveTenantId, reload: load };
}

/** Papel do usuário no tenant ativo. */
export function useIgRole(me: IgMe | null, tenantId: string | null): IgRole | null {
  return useMemo(() => {
    if (!me || !tenantId) return null;
    return me.memberships.find((m) => m.tenant_id === tenantId)?.role ?? null;
  }, [me, tenantId]);
}

/** Entitlements centralizados — regras de plano nunca espalhadas pelo código. */
export function useEntitlements(me: IgMe | null, tenantId: string | null): {
  plan: IgPlan | null;
  can: (feature: string) => boolean;
  limit: (key: keyof IgPlan) => number | null;
} {
  const plan = useMemo(() => {
    if (!me || !tenantId) return null;
    const tenant = me.tenants.find((t) => t.id === tenantId);
    if (!tenant) return null;
    return me.plans.find((p) => p.id === tenant.plan_id) ?? null;
  }, [me, tenantId]);

  return useMemo(
    () => ({
      plan,
      can: (feature: string) => Boolean(plan?.features?.[feature]),
      limit: (key: keyof IgPlan) => {
        const value = plan?.[key];
        return typeof value === "number" ? value : null;
      },
    }),
    [plan],
  );
}
