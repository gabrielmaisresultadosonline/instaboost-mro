/**
 * Shell do produto MRO Instagram: sidebar + header + conteúdo.
 * Responsivo — no mobile a navegação vira um drawer.
 */
import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bot,
  CalendarDays,
  Film,
  Kanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  MessageSquare,
  Menu,
  Settings,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { IgTenant } from "@/lib/ig/api";

const NAV = [
  { to: "/IG/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/IG/inbox", label: "Inbox", icon: MessageCircle },
  { to: "/IG/comments", label: "Comentários", icon: MessageSquare },
  { to: "/IG/automations", label: "Automações", icon: Zap },
  { to: "/IG/contacts", label: "Contatos", icon: Users },
  { to: "/IG/crm", label: "CRM", icon: Kanban },
  { to: "/IG/content", label: "Conteúdo", icon: CalendarDays },
  { to: "/IG/reels", label: "Reels", icon: Film },
  { to: "/IG/stories", label: "Stories", icon: Sparkles },
  { to: "/IG/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/IG/ai", label: "IA", icon: Bot },
  { to: "/IG/settings", label: "Configurações", icon: Settings },
];

export interface IgLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  tenants?: IgTenant[];
  activeTenantId?: string | null;
  onTenantChange?: (tenantId: string) => void;
  actions?: ReactNode;
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function IgLayout({
  children,
  title,
  description,
  tenants = [],
  activeTenantId,
  onTenantChange,
  actions,
}: IgLayoutProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/IG/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
          <Link to="/IG" className="mb-8 flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-bold uppercase tracking-wide">MRO Instagram</span>
          </Link>
          <NavItems />
          <div className="mt-auto pt-6">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" aria-hidden />
              Sair
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu className="h-4 w-4" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-card">
                <div className="mb-6 mt-2 text-sm font-bold uppercase tracking-wide">MRO Instagram</div>
                <NavItems onNavigate={() => setMobileOpen(false)} />
                <Button variant="ghost" size="sm" className="mt-6 w-full justify-start" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" aria-hidden />
                  Sair
                </Button>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold">{title}</h1>
              {description ? (
                <p className="truncate text-xs text-muted-foreground">{description}</p>
              ) : null}
            </div>

            {tenants.length > 1 && onTenantChange ? (
              <Select value={activeTenantId ?? undefined} onValueChange={onTenantChange}>
                <SelectTrigger className="w-full sm:w-48" aria-label="Selecionar cliente">
                  <SelectValue placeholder="Selecionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : tenants.length === 1 ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {tenants[0].name}
              </Badge>
            ) : null}

            {actions}
          </header>

          <main className="px-4 py-6 md:px-6 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default IgLayout;
