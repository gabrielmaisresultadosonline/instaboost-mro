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
import IgInbox from "./IgInbox";
import IgAi from "./IgAi";
import IgAutomations from "./IgAutomations";
import IgDiagnostics from "./IgDiagnostics";
import IgInstagramCallback from "./IgInstagramCallback";
import IgSettings from "./IgSettings";
import IgSettingsInstagram from "./IgSettingsInstagram";
import IgModulePlaceholder from "./IgModulePlaceholder";
import { IgReelsPage, IgContentPage } from "./IgMedia";
import IgCommentsPage from "./IgComments";
import { IgContactsPage, IgCrmPage } from "./IgContacts";
import IgAdminLogin from "./IgAdminLogin";
import IgAdminDashboard from "./IgAdminDashboard";
import IgAdminUsers from "./IgAdminUsers";
import IgAdminInstagram from "./IgAdminInstagram";
import IgAdminLogs from "./IgAdminLogs";
import IgAdminApp from "./IgAdminApp";

/** Módulos das fases 2 a 5: shell e isolamento já ativos, dados reais em breve. */
const MODULES: Array<{ path: string; title: string; description: string; phase: string }> = [
  { path: "stories/*", title: "Stories", description: "Recursos de Stories oficialmente suportados pela API.", phase: "Publicação" },
  {
    path: "analytics/*",
    title: "Analytics",
    description: "Crescimento, conteúdo, audiência, score e oportunidades a partir dos Insights da Meta.",
    phase: "Analytics",
  },
  
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
    <Route path="inbox" element={<IgInbox />} />
    <Route path="comments" element={<IgCommentsPage />} />
    <Route path="contacts" element={<IgContactsPage />} />
    <Route path="crm" element={<IgCrmPage />} />
    <Route path="ai" element={<IgAi />} />
    <Route path="automations" element={<IgAutomations />} />
    <Route path="diagnostico" element={<IgDiagnostics />} />
    <Route path="diagnostics" element={<Navigate to="/IG/diagnostico" replace />} />
    <Route path="reels" element={<IgReelsPage />} />
    <Route path="content" element={<IgContentPage />} />
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
    <Route path="admin/app" element={<IgAdminApp />} />
    <Route path="admin/logs" element={<IgAdminLogs />} />

    <Route path="*" element={<Navigate to="/IG" replace />} />
  </Routes>
);

export default IgRoutes;
