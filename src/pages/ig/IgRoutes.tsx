/**
 * Roteador isolado do módulo MRO Instagram.
 * Montado em /IG/* pelo roteador principal — nenhuma rota existente do
 * projeto é alterada.
 */
import { Navigate, Route, Routes } from "react-router-dom";
import IgLanding from "./IgLanding";
import IgLogin from "./IgLogin";
import IgRegister from "./IgRegister";
import IgForgotPassword from "./IgForgotPassword";
import IgResetPassword from "./IgResetPassword";
import IgDashboard from "./IgDashboard";
import IgInstagramCallback from "./IgInstagramCallback";
import IgSettings from "./IgSettings";
import IgSettingsInstagram from "./IgSettingsInstagram";
import IgModulePlaceholder from "./IgModulePlaceholder";
import IgAdminLogin from "./IgAdminLogin";
import IgAdminDashboard from "./IgAdminDashboard";
import IgAdminUsers from "./IgAdminUsers";
import IgAdminInstagram from "./IgAdminInstagram";
import IgAdminLogs from "./IgAdminLogs";

/** Módulos das fases 2 a 5: shell e isolamento já ativos, dados reais em breve. */
const MODULES: Array<{ path: string; title: string; description: string; phase: string }> = [
  {
    path: "inbox/*",
    title: "Inbox",
    description: "As conversas de Direct aparecem aqui conforme os eventos chegam pela API oficial da Meta.",
    phase: "Direct e atendimento",
  },
  {
    path: "comments/*",
    title: "Comentários",
    description: "Comentários recebidos nos seus posts e Reels, com resposta pública e Direct privado.",
    phase: "Comentários e resposta privada",
  },
  {
    path: "automations/*",
    title: "Automações",
    description: "Gatilho, condição e ação: comentário para Direct, palavras-chave e acionamento de IA.",
    phase: "Automação",
  },
  {
    path: "contacts/*",
    title: "Contatos",
    description: "Base de contatos formada a partir das interações reais do seu Instagram.",
    phase: "CRM",
  },
  { path: "crm/*", title: "CRM", description: "Funil Kanban dos leads originados no Instagram.", phase: "CRM" },
  {
    path: "content/*",
    title: "Conteúdo",
    description: "Publicação, agendamento e calendário via Content Publishing API.",
    phase: "Publicação",
  },
  { path: "reels/*", title: "Reels", description: "Desempenho dos seus Reels conforme métricas liberadas pela Meta.", phase: "Publicação" },
  { path: "stories/*", title: "Stories", description: "Recursos de Stories oficialmente suportados pela API.", phase: "Publicação" },
  {
    path: "analytics/*",
    title: "Analytics",
    description: "Crescimento, conteúdo, audiência, score e oportunidades a partir dos Insights da Meta.",
    phase: "Analytics",
  },
  { path: "ai/*", title: "IA", description: "Configurações e base de conhecimento da IA de atendimento e conteúdo.", phase: "IA" },
  { path: "settings/team", title: "Equipe", description: "Convites, papéis e permissões dos membros do workspace.", phase: "Configurações" },
  { path: "settings/notifications", title: "Notificações", description: "Escolha quais eventos geram aviso para a sua equipe.", phase: "Configurações" },
  { path: "settings/billing", title: "Plano e cobrança", description: "Plano atual, limites contratados e consumo do período.", phase: "Configurações" },
  { path: "settings/security", title: "Segurança", description: "Senha, sessões ativas e registros de acesso da sua conta.", phase: "Configurações" },
];

const IgRoutes = () => (
  <Routes>
    <Route index element={<IgLanding />} />
    <Route path="login" element={<IgLogin />} />
    <Route path="register" element={<IgRegister />} />
    <Route path="forgot-password" element={<IgForgotPassword />} />
    <Route path="reset-password" element={<IgResetPassword />} />

    <Route path="dashboard" element={<IgDashboard />} />
    <Route path="auth/instagram" element={<Navigate to="/IG/settings/instagram" replace />} />
    <Route path="auth/instagram/callback" element={<IgInstagramCallback />} />

    <Route path="settings" element={<IgSettings />} />
    <Route path="settings/instagram" element={<IgSettingsInstagram />} />

    {MODULES.map((module) => (
      <Route
        key={module.path}
        path={module.path}
        element={
          <IgModulePlaceholder
            title={module.title}
            description={module.description}
            phase={module.phase}
          />
        }
      />
    ))}

    <Route path="admin" element={<Navigate to="/IG/admin/dashboard" replace />} />
    <Route path="admin/login" element={<IgAdminLogin />} />
    <Route path="admin/dashboard" element={<IgAdminDashboard />} />
    <Route path="admin/users" element={<IgAdminUsers />} />
    <Route path="admin/users/:id" element={<IgAdminUsers />} />
    <Route path="admin/instagram" element={<IgAdminInstagram />} />
    <Route path="admin/logs" element={<IgAdminLogs />} />

    <Route path="*" element={<Navigate to="/IG" replace />} />
  </Routes>
);

export default IgRoutes;
