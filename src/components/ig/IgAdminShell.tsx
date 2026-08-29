/** Shell do painel administrativo global do /IG (SUPER_ADMIN). */
import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Activity, Instagram, LayoutDashboard, LogOut, ScrollText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAdminToken, setAdminToken } from "@/lib/ig/adminApi";
import { IgLoading } from "./IgStates";

const NAV = [
  { to: "/IG/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/IG/admin/users", label: "Usuários", icon: Users },
  { to: "/IG/admin/instagram", label: "Instagram", icon: Instagram },
  { to: "/IG/admin/logs", label: "Logs", icon: ScrollText },
];

export function IgAdminShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      navigate("/IG/admin/login", { replace: true });
      return;
    }
    setChecked(true);
  }, [navigate]);

  if (!checked) return <IgLoading label="Validando sessão administrativa..." className="min-h-screen" />;

  const handleLogout = () => {
    setAdminToken(null);
    navigate("/IG/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-widest">MRO Instagram · Admin</span>
          </div>
          <nav className="flex flex-1 flex-wrap items-center gap-1" aria-label="Navegação administrativa">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-lg font-bold">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export default IgAdminShell;
