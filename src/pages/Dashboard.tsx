import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { markHubReturn } from "@/lib/hubReturn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, LogIn, LogOut, ArrowRight, ShoppingCart, Eye, Package, Settings, Mail, KeyRound } from "lucide-react";


export const DASHBOARD_SESSION_KEY = "mro_dashboard_session";

export interface DashboardSession {
  username: string | null;
  email: string | null;
  name: string | null;
  password: string;
}

export interface HubProduct {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumb_url: string | null;
  app_route: string | null;
  sales_page_url: string | null;
  price: number;
  access_source: string;
  unlocked: boolean;
}

export function getDashboardSession(): DashboardSession | null {
  try {
    const raw = localStorage.getItem(DASHBOARD_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardSession;
    if (!parsed?.username && !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<DashboardSession | null>(() => getDashboardSession());
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [products, setProducts] = useState<HubProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const [lockedProduct, setLockedProduct] = useState<HubProduct | null>(null);
  const [buyName, setBuyName] = useState("");
  const [buyEmail, setBuyEmail] = useState("");
  const [buyPhone, setBuyPhone] = useState("");
  const [buying, setBuying] = useState(false);

  // ---- Perfil / Configurações ----
  interface HubProfile {
    username: string;
    email: string;
    name: string;
    whatsapp: string;
    has_email: boolean;
  }
  const [profile, setProfile] = useState<HubProfile | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWhats, setFormWhats] = useState("");
  const [formNewPassword, setFormNewPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");

  // ---- Recuperar acesso ----
  const [showRecover, setShowRecover] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recovering, setRecovering] = useState(false);

  // Unificação de acessos quando o e-mail já pertence a outro login
  const [mergeEmail, setMergeEmail] = useState("");
  const [mergeConflicts, setMergeConflicts] = useState<{ tool: string; username: string }[]>([]);
  const [merging, setMerging] = useState(false);
  const [mergeResult, setMergeResult] = useState<{
    email: string;
    emailSent: boolean;
    primary: { username: string; password: string };
    accounts: { tool: string; username: string; password: string }[];
  } | null>(null);

  const loadProfile = useCallback(async (current: DashboardSession) => {
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: {
          action: "profile",
          username: current.username || "",
          email: current.email || "",
          password: current.password,
        },
      });
      if (data?.success && data.profile) {
        const p = data.profile as HubProfile;
        setProfile(p);
        setFormName(p.name || current.name || "");
        setFormEmail(p.email || "");
        setFormWhats(p.whatsapp || "");
        // Cliente sem e-mail cadastrado precisa cadastrar antes de continuar.
        setNeedsEmail(!p.email);
      }
    } catch {
      /* silencioso: o dashboard continua funcionando sem o perfil */
    }
  }, []);



  const loadProducts = useCallback(async (current: DashboardSession) => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: { action: "products", username: current.username || "", email: current.email || "" },
      });
      if (data?.success) {
        setProducts(data.products as HubProduct[]);
        // O backend resolve a identidade completa (e-mail vinculado ao usuário etc).
        // Guardamos isso na sessão para conseguir logar automaticamente nas ferramentas.
        const identity = data.identity as { email?: string | null; username?: string | null } | undefined;
        if (identity && ((identity.email && !current.email) || (identity.username && !current.username))) {
          const merged: DashboardSession = {
            ...current,
            email: current.email || identity.email || null,
            username: current.username || identity.username || null,
          };
          localStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(merged));
          setSession(merged);
        }
      }
    } catch {
      toast({ title: "Erro ao carregar produtos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    if (session) {
      loadProducts(session);
      loadProfile(session);
    }
  }, [session, loadProducts, loadProfile]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast({ title: "Preencha usuário/e-mail e senha", variant: "destructive" });
      return;
    }
    setLoggingIn(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: { action: "login", identifier: identifier.trim(), password },
      });
      if (data?.success) {
        const next: DashboardSession = {
          username: data.user.username || null,
          email: data.user.email || null,
          name: data.user.name || null,
          password,
        };
        localStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(next));
        setSession(next);
      } else {
        toast({ title: data?.error || "Não foi possível entrar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro inesperado ao entrar", variant: "destructive" });
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(DASHBOARD_SESSION_KEY);
    setSession(null);
    setProducts([]);
    setProfile(null);
    setNeedsEmail(false);
  };

  /**
   * Salva os dados do cliente (nome, e-mail, WhatsApp e senha) no banco.
   * O nome de acesso (usuário) nunca é alterado nem removido.
   */
  const saveProfile = async (requireEmail: boolean) => {
    if (!session) return;
    const email = formEmail.trim().toLowerCase();
    if ((requireEmail || email) && !email.includes("@")) {
      toast({ title: "Informe um e-mail válido", variant: "destructive" });
      return;
    }
    if (formNewPassword && formNewPassword !== formConfirmPassword) {
      toast({ title: "As senhas não conferem", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: {
          action: "update_profile",
          username: session.username || "",
          email: session.email || "",
          password: session.password,
          new_email: email,
          new_name: formName.trim(),
          new_whatsapp: formWhats,
          new_password: formNewPassword || undefined,
        },
      });
      if (!data?.success) {
        if (data?.conflict) {
          setMergeEmail(email);
          setMergeConflicts(Array.isArray(data.conflict_accounts) ? data.conflict_accounts : []);
          return;
        }
        toast({ title: data?.error || "Não foi possível salvar", variant: "destructive" });
        return;
      }
      const next: DashboardSession = {
        username: session.username || data.profile?.username || null,
        email: data.profile?.email || email || session.email,
        name: data.profile?.name || formName.trim() || session.name,
        password: (data.password as string) || session.password,
      };
      localStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(next));
      setSession(next);
      setProfile((prev) =>
        prev
          ? { ...prev, email: next.email || "", name: next.name || "", whatsapp: formWhats, has_email: !!next.email }
          : prev,
      );
      setFormNewPassword("");
      setFormConfirmPassword("");
      setNeedsEmail(false);
      setShowConfig(false);
      toast({ title: "Dados salvos com sucesso" });
    } catch {
      toast({ title: "Erro ao salvar seus dados", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  /**
   * Unifica todos os acessos do cliente no mesmo e-mail e dispara o resumo por e-mail.
   */
  const handleMerge = async () => {
    if (!session || !mergeEmail) return;
    setMerging(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: {
          action: "merge_accounts",
          username: session.username || "",
          email: session.email || "",
          password: session.password,
          target_email: mergeEmail,
        },
      });
      if (!data?.success) {
        toast({ title: data?.error || "Não foi possível unificar", variant: "destructive" });
        return;
      }
      const next: DashboardSession = { ...session, email: mergeEmail };
      localStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(next));
      setSession(next);
      setProfile((prev) => (prev ? { ...prev, email: mergeEmail, has_email: true } : prev));
      setNeedsEmail(false);
      setShowConfig(false);
      setMergeConflicts([]);
      setMergeResult({
        email: data.email || mergeEmail,
        emailSent: !!data.emailSent,
        primary: data.primary || { username: session.username || "", password: session.password },
        accounts: Array.isArray(data.accounts) ? data.accounts : [],
      });
    } catch {
      toast({ title: "Erro ao unificar seus acessos", variant: "destructive" });
    } finally {
      setMerging(false);
    }
  };



  /** Envia um único lembrete de acesso para o e-mail vinculado ao cliente. */
  const handleRecover = async () => {
    const email = recoverEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      toast({ title: "Informe um e-mail válido", variant: "destructive" });
      return;
    }
    setRecovering(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: { action: "recover_access", email },
      });
      if (data?.success) {
        toast({ title: "Enviamos seu acesso", description: `Confira a caixa de entrada de ${email}.` });
        setShowRecover(false);
        setRecoverEmail("");
      } else {
        toast({ title: data?.error || "Não foi possível recuperar", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao recuperar acesso", variant: "destructive" });
    } finally {
      setRecovering(false);
    }
  };



  /**
   * Abre o produto já autenticado. Cada ferramenta guarda a sessão de um jeito
   * diferente, então hidratamos o storage esperado antes de navegar.
   */
  const openProduct = async (product: HubProduct) => {
    if (!session) return;
    setOpening(product.id);
    try {
      if (product.access_source === "mro_tool" && session.username) {
        const { loginToSquare } = await import("@/lib/squareApi");
        const { loginUser } = await import("@/lib/userStorage");
        try {
          const result = await loginToSquare(session.username, session.password);
          if (result.success) {
            await loginUser(session.username, result.daysRemaining || 365, session.email || undefined, session.password);
          }
        } catch {
          /* segue para a tela de login da ferramenta se falhar */
        }
      }

      if (product.access_source === "zapmro" && session.username) {
        localStorage.setItem("zapmro_authenticated", "true");
        localStorage.setItem("zapmro_username", session.username);
        localStorage.setItem("zapmro_password", session.password);
        if (session.email) localStorage.setItem("zapmro_email", session.email);
      }

      // Posts com IA usa apenas e-mail. Se o cliente entrou por usuário (ou o acesso
      // foi liberado manualmente, sem pedido no /postscomia/admin), resolvemos o
      // e-mail vinculado e, na falta dele, criamos a sessão pelo próprio usuário.
      // O produto já veio marcado como `unlocked` pela hub-api, então a liberação
      // manual é autoridade suficiente para abrir a área de membros logado.
      if (product.access_source === "postscomia" || product.slug === "postscomia") {
        let memberEmail = session.email;
        if (!memberEmail) {
          try {
            const { data } = await supabase.functions.invoke("hub-api", {
              body: { action: "products", username: session.username || "", email: "" },
            });
            memberEmail = (data?.identity?.email as string | undefined) || null;
          } catch {
            /* segue com o fallback por usuário */
          }
        }
        const memberName = session.name || memberEmail || session.username || "Aluno";
        localStorage.setItem(
          "postscomia_member",
          JSON.stringify({
            email: memberEmail || "",
            name: memberName,
            username: session.username || null,
            via_hub: true,
          }),
        );
      }



      // Marca a sessão para que os botões de "voltar" das ferramentas
      // retornem para o Dashboard.
      markHubReturn();

      if (product.app_route) {
        navigate(product.app_route);
      } else {
        navigate(`/dashboard/produto/${product.slug}`);
      }
    } finally {
      setOpening(null);
    }
  };

  const handleCardClick = (product: HubProduct) => {
    if (product.unlocked) {
      // Produtos com rota própria abrem direto a ferramenta já logada.
      if (product.app_route) void openProduct(product);
      else {
        markHubReturn();
        navigate(`/dashboard/produto/${product.slug}`);
      }
      return;
    }
    setBuyName(session?.name || "");
    setBuyEmail(session?.email || "");
    setBuyPhone("");
    setLockedProduct(product);
  };

  const handleBuy = async () => {
    if (!lockedProduct) return;
    if (!buyName.trim() || !buyEmail.includes("@")) {
      toast({ title: "Informe nome e e-mail válidos", variant: "destructive" });
      return;
    }
    setBuying(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: {
          action: "create_checkout",
          slug: lockedProduct.slug,
          name: buyName.trim(),
          email: buyEmail.trim().toLowerCase(),
          whatsapp: buyPhone,
        },
      });
      if (data?.success && data.payment_link) {
        window.open(data.payment_link, "_blank");
        toast({ title: "Pagamento gerado", description: "Assim que confirmado o acesso é liberado automaticamente." });
        setLockedProduct(null);
      } else {
        toast({ title: data?.error || "Erro ao gerar pagamento", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao gerar pagamento", variant: "destructive" });
    } finally {
      setBuying(false);
    }
  };

  const greeting = useMemo(() => session?.name || session?.username || session?.email || "", [session]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard MRO</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Entre com seu usuário ou e-mail para acessar todos os seus produtos em um só lugar.
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Usuário ou e-mail</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="seu usuário ou e-mail"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="sua senha"
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loggingIn}>
                {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Entrar
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                onClick={() => setShowRecover(true)}
              >
                Esqueci minha senha
              </button>
            </form>
          </CardContent>
        </Card>

        <Dialog open={showRecover} onOpenChange={setShowRecover}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Recuperar acesso</DialogTitle>
              <DialogDescription>
                Informe o e-mail cadastrado. Enviamos um único lembrete com seu acesso — ele vale para todos os seus produtos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="recover-email">E-mail de acesso</Label>
                <Input
                  id="recover-email"
                  type="email"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                />
              </div>
              <Button className="w-full" onClick={handleRecover} disabled={recovering}>
                {recovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar meu acesso
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Seus produtos</h1>
            <p className="text-sm text-muted-foreground">Olá, {greeting}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
              <Settings className="h-4 w-4" /> Config
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>

        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">Nenhum produto disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => handleCardClick(product)}
              >
                <div className="relative aspect-video bg-muted">
                  {product.thumb_url ? (
                    <img src={product.thumb_url} alt={product.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  {!product.unlocked && (
                    <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-foreground">{product.title}</h2>
                    <Badge variant={product.unlocked ? "default" : "secondary"}>
                      {product.unlocked ? "Liberado" : "Bloqueado"}
                    </Badge>
                  </div>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>
                  )}
                  <Button
                    className="w-full mt-2"
                    variant={product.unlocked ? "default" : "secondary"}
                    disabled={opening === product.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (product.unlocked) openProduct(product);
                      else handleCardClick(product);
                    }}
                  >
                    {opening === product.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : product.unlocked ? (
                      <>
                        Acessar <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" /> Desbloquear
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!lockedProduct} onOpenChange={(open) => !open && setLockedProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{lockedProduct?.title}</DialogTitle>
            <DialogDescription>
              {lockedProduct?.description || "Este produto ainda não está liberado no seu acesso."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="buy-name">Nome completo</Label>
              <Input id="buy-name" value={buyName} onChange={(e) => setBuyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buy-email">E-mail</Label>
              <Input id="buy-email" type="email" value={buyEmail} onChange={(e) => setBuyEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buy-phone">WhatsApp (DDD + número)</Label>
              <Input id="buy-phone" value={buyPhone} onChange={(e) => setBuyPhone(e.target.value)} placeholder="11999999999" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button className="flex-1" onClick={handleBuy} disabled={buying}>
                {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                Comprar {lockedProduct?.price ? `R$ ${Number(lockedProduct.price).toFixed(0)}` : ""}
              </Button>
              {lockedProduct?.sales_page_url && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(lockedProduct.sales_page_url as string, "_blank")}
                >
                  <Eye className="h-4 w-4" /> Ver mais
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cadastro obrigatório de e-mail para quem ainda não tem */}
      <Dialog open={needsEmail && !showConfig} onOpenChange={() => { /* obrigatório */ }}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Cadastre seu e-mail</DialogTitle>
            <DialogDescription>
              Precisamos do seu e-mail para vincular seus acessos e permitir a recuperação de senha. Ele fica salvo junto ao seu acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome de acesso</Label>
              <Input value={profile?.username || session.username || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="force-email">E-mail *</Label>
              <Input
                id="force-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="force-name">Nome</Label>
              <Input id="force-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="force-whats">WhatsApp (opcional)</Label>
              <Input id="force-whats" value={formWhats} onChange={(e) => setFormWhats(e.target.value)} placeholder="11999999999" />
            </div>
            <Button className="w-full" onClick={() => saveProfile(true)} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Salvar e continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configurações da conta */}
      <Dialog open={showConfig} onOpenChange={(open) => setShowConfig(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurações da conta</DialogTitle>
            <DialogDescription>
              Atualize seus dados de acesso. O nome de acesso não pode ser alterado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome de acesso</Label>
              <Input value={profile?.username || session.username || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-name">Nome</Label>
              <Input id="cfg-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-email">E-mail</Label>
              <Input id="cfg-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-whats">WhatsApp (opcional)</Label>
              <Input id="cfg-whats" value={formWhats} onChange={(e) => setFormWhats(e.target.value)} placeholder="11999999999" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cfg-pass">Nova senha</Label>
                <Input
                  id="cfg-pass"
                  type="password"
                  value={formNewPassword}
                  onChange={(e) => setFormNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-pass2">Confirmar senha</Label>
                <Input
                  id="cfg-pass2"
                  type="password"
                  value={formConfirmPassword}
                  onChange={(e) => setFormConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button className="w-full" onClick={() => saveProfile(false)} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );
}
