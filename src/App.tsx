import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ToolSelector from "./pages/ToolSelector";
import Index from "./pages/Index";
import ZapMRO from "./pages/ZapMRO";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import MROFerramenta from "./pages/MROFerramenta";
import MROPagamento from "./pages/MROPagamento";
import MROObrigado from "./pages/MROObrigado";
import Vendas from "./pages/Vendas";
import VendasCompleta from "./pages/VendasCompleta";
import InstagramNovaAdmin from "./pages/InstagramNovaAdmin";
import Membro from "./pages/Membro";
import Ligacao from "./pages/Ligacao";
import Obrigado from "./pages/Obrigado";
import ObrigadoZapmro from "./pages/ObrigadoZapmro";
import ZapMROVendas from "./pages/ZapMROVendas";
import Promo33 from "./pages/Promo33";
import Promo33Dashboard from "./pages/Promo33Dashboard";
import Promo33Obrigado from "./pages/Promo33Obrigado";
import Promo33Admin from "./pages/Promo33Admin";
import GestaoMensal from "./pages/GestaoMensal";
import AdminUsuario from "./pages/AdminUsuario";
import MelhorarPublico from "./pages/MelhorarPublico";
import Pagamento from "./pages/Pagamento";
import PagamentoObrigado from "./pages/PagamentoObrigado";
import PagamentoAdmin from "./pages/PagamentoAdmin";
import ComprouSeguidores from "./pages/ComprouSeguidores";
import MetodoSeguidorMembro from "./pages/MetodoSeguidorMembro";
import MetodoSeguidorAdmin from "./pages/MetodoSeguidorAdmin";
import AreaDeMembros from "./pages/AreaDeMembros";
import AdsNews from "./pages/AdsNews";
import AdsNewsDash from "./pages/AdsNewsDash";
import AdsNewsAdmin from "./pages/AdsNewsAdmin";
import PoliticaCancelamento from "./pages/PoliticaCancelamento";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ToolSelector />} />
          <Route path="/instagram" element={<Index />} />
          <Route path="/zapmro" element={<ZapMRO />} />
          <Route path="/zapmro/vendas" element={<ZapMROVendas />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/mro-ferramenta" element={<MROFerramenta />} />
          <Route path="/mropagamento" element={<MROPagamento />} />
          <Route path="/mroobrigado" element={<MROObrigado />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/instagram-nova" element={<VendasCompleta />} />
          <Route path="/instagram-nova-admin" element={<InstagramNovaAdmin />} />
          <Route path="/mrointeligente" element={<VendasCompleta />} />
          <Route path="/membro" element={<Membro />} />
          <Route path="/ligacao" element={<Ligacao />} />
          <Route path="/obrigado" element={<Obrigado />} />
          <Route path="/obrigadozapmro" element={<ObrigadoZapmro />} />
          <Route path="/promo33" element={<Promo33 />} />
          <Route path="/promo33/dashboard" element={<Promo33Dashboard />} />
          <Route path="/promo33/obrigado" element={<Promo33Obrigado />} />
          <Route path="/promo33/admin" element={<Promo33Admin />} />
          <Route path="/gestaomensal" element={<GestaoMensal />} />
          <Route path="/adminusuario" element={<AdminUsuario />} />
          <Route path="/melhorarpublico" element={<MelhorarPublico />} />
          <Route path="/pagamento" element={<Pagamento />} />
          <Route path="/pagamentoobrigado" element={<PagamentoObrigado />} />
          <Route path="/pagamentoadmin" element={<PagamentoAdmin />} />
          <Route path="/comprouseguidores" element={<ComprouSeguidores />} />
          <Route path="/metodoseguidormembro" element={<MetodoSeguidorMembro />} />
          <Route path="/metodoseguidoradmin" element={<MetodoSeguidorAdmin />} />
          <Route path="/areademembros" element={<AreaDeMembros />} />
          <Route path="/anuncios" element={<AdsNews />} />
          <Route path="/anuncios/dash" element={<AdsNewsDash />} />
          <Route path="/anuncios/admin" element={<AdsNewsAdmin />} />
          <Route path="/politica-de-cancelamento" element={<PoliticaCancelamento />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
