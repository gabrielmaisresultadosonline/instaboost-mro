/** /IG/settings — índice das configurações do workspace. */
import { Link } from "react-router-dom";
import { Bell, CreditCard, Instagram, Shield, Users } from "lucide-react";
import IgLayout from "@/components/ig/IgLayout";
import IgGuard from "@/components/ig/IgGuard";
import { resolveEntitlements } from "@/lib/ig/useIgSession";

const SECTIONS = [
  { to: "/IG/settings/instagram", icon: Instagram, title: "Instagram", text: "Conectar, reconectar e desconectar contas." },
  { to: "/IG/settings/team", icon: Users, title: "Equipe", text: "Papéis e permissões dos membros." },
  { to: "/IG/settings/notifications", icon: Bell, title: "Notificações", text: "Escolha quais eventos avisam você." },
  { to: "/IG/settings/billing", icon: CreditCard, title: "Plano e cobrança", text: "Plano atual, limites e uso." },
  { to: "/IG/settings/security", icon: Shield, title: "Segurança", text: "Senha e sessões da conta." },
];

const IgSettings = () => (
  <IgGuard>
    {({ me, activeTenantId, setActiveTenantId }) => {
      const plan = resolveEntitlements(me, activeTenantId).plan;

      return (
        <IgLayout
          title="Configurações"
          description={plan ? `Plano ${plan.name}` : undefined}
          tenants={me?.tenants ?? []}
          activeTenantId={activeTenantId}
          onTenantChange={setActiveTenantId}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map(({ to, icon: Icon, title, text }) => (
              <Link
                key={to}
                to={to}
                className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="mt-3 text-sm font-bold">{title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{text}</p>
              </Link>
            ))}
          </div>
        </IgLayout>
      );
    }}
  </IgGuard>
);

export default IgSettings;
