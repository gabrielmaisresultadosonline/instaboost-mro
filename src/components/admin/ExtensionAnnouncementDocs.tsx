import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileText, Copy, Check, X, Code, ExternalLink, 
  Clock, Eye, Bell, Settings, Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  ANON_KEY_PLACEHOLDER,
  SUPABASE_ANON_KEY,
  SUPABASE_API_URL,
  vpsAnonKey,
  vpsAnonKeyFromBuild,
  vpsApiUrl,
} from '@/lib/vpsApiConfig';

interface ExtensionAnnouncementDocsProps {
  announcementId?: string;
  isOpen: boolean;
  onClose: () => void;
  targetArea?: string;
}

const ExtensionAnnouncementDocs = ({ announcementId, isOpen, onClose, targetArea = 'extension' }: ExtensionAnnouncementDocsProps) => {
  const { toast } = useToast();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  /**
   * Qual backend a documentação descreve. Mantemos os dois lado a lado para
   * publicar a extensão nova e validar em produção antes de desligar o antigo.
   */
  const [backend, setBackend] = useState<'supabase' | 'postgres'>('postgres');

  const supabaseUrl = SUPABASE_API_URL;
  const postgresUrl = vpsApiUrl();
  const anonKeyFromBuild = vpsAnonKeyFromBuild();
  const postgresKey = vpsAnonKey() || ANON_KEY_PLACEHOLDER;
  const supabaseKey = SUPABASE_ANON_KEY || 'COLE_AQUI_A_ANON_KEY_DO_SUPABASE';

  const isPostgres = backend === 'postgres';
  const baseUrl = isPostgres ? postgresUrl : supabaseUrl;
  const apiKey = isPostgres ? postgresKey : supabaseKey;

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast({ title: 'Copiado!', description: `${section} copiado para área de transferência` });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!isOpen) return null;

  const extensionNumber = targetArea.replace('extension', '');
  const fileName = targetArea === 'extension' ? 'extension-announcements.json' : `${targetArea}-announcements.json`;
  const storageKey = `mro_${targetArea}_announcements`;
  const label = targetArea === 'extension' ? 'Extensão Chrome' : `Extensão Chrome ${extensionNumber}`;
  const endpoint = `${baseUrl}/storage/v1/object/public/user-data/admin/${fileName}`;

  /**
   * Chaves prontas para copiar. O storage público não exige `apikey`, mas
   * enviamos de qualquer forma: o mesmo bloco serve para as rotas /rest/v1 e
   * /functions/v1, onde a chave é obrigatória em ambos os backends.
   */
  const keysSnippet = `# ---- Avisos: ${isPostgres ? 'PostgreSQL (VPS)' : 'Supabase (atual)'} ----
API_URL=${baseUrl}
API_ANON_KEY=${apiKey}
ENDPOINT_AVISOS=${endpoint}

# Headers usados nas rotas autenticadas (/rest/v1 e /functions/v1):
#   apikey: ${apiKey}
#   Authorization: Bearer ${apiKey}

# ---- Backend antigo (Supabase), mantenha durante a transição ----
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseKey}`;

  const fallbackSnippet = `// 🔁 Avisos com fallback automático (zero downtime)
const AVISOS = [
  { name: "postgres", url: "${postgresUrl}/storage/v1/object/public/user-data/admin/${fileName}", apikey: "${postgresKey}" },
  { name: "supabase", url: "${supabaseUrl}/storage/v1/object/public/user-data/admin/${fileName}", apikey: "${supabaseKey}" },
];

async function fetchAnnouncementsWithFallback() {
  for (const cfg of AVISOS) {
    try {
      const res = await fetch(cfg.url + "?t=" + Date.now(), {
        headers: { apikey: cfg.apikey, Authorization: "Bearer " + cfg.apikey },
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return { announcements: data.announcements || [], _backend: cfg.name };
    } catch (error) {
      console.warn("[avisos] backend indisponível:", cfg.name, error);
    }
  }
  return { announcements: [], _backend: null };
}`;


  const fetchCode = `// 🔔 Buscar avisos da extensão (${isPostgres ? 'PostgreSQL / VPS' : 'Supabase'})
const ANNOUNCEMENTS_URL = '${endpoint}';
const API_ANON_KEY = '${apiKey}';

async function fetchExtensionAnnouncements() {
  try {
    const response = await fetch(ANNOUNCEMENTS_URL + '?t=' + Date.now(), {
      headers: { apikey: API_ANON_KEY, Authorization: 'Bearer ' + API_ANON_KEY },
    });
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.announcements || [];
  } catch (error) {
    console.error('Erro ao buscar avisos:', error);
    return [];
  }
}`;

  const displayLogicCode = `// 📋 Lógica de exibição de avisos
const STORAGE_KEY = '${storageKey}';

function getViewedAnnouncements() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveViewedAnnouncement(id, announcement) {
  const viewed = getViewedAnnouncements();
  const now = Date.now();
  
  viewed[id] = {
    viewCount: (viewed[id]?.viewCount || 0) + 1,
    lastViewed: now,
    firstViewed: viewed[id]?.firstViewed || now
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(viewed));
}

function shouldShowAnnouncement(announcement) {
  if (!announcement.isActive) return false;
  
  const viewed = getViewedAnnouncements()[announcement.id];
  if (!viewed) return true;
  
  const { frequencyType, frequencyValue, frequencyHours } = announcement;
  
  // Verificar limite de exibições
  if (frequencyType === 'times_per_day') {
    const today = new Date().toDateString();
    const lastViewedDate = new Date(viewed.lastViewed).toDateString();
    
    if (today !== lastViewedDate) {
      // Novo dia, resetar contagem
      return true;
    }
    
    return viewed.viewCount < frequencyValue;
  }
  
  if (frequencyType === 'times_per_hours') {
    const hoursMs = (frequencyHours || 1) * 60 * 60 * 1000;
    const timeSinceFirst = Date.now() - viewed.firstViewed;
    const currentPeriod = Math.floor(timeSinceFirst / hoursMs);
    const viewsThisPeriod = viewed.viewCount; // Simplificado
    
    return viewsThisPeriod < frequencyValue;
  }
  
  if (frequencyType === 'once') {
    return viewed.viewCount < 1;
  }
  
  return true;
}`;

  const delayCode = `// ⏱️ Exibir aviso com delay configurado
async function showAnnouncementWithDelay(announcement) {
  const delayMs = (announcement.delaySeconds || 0) * 1000;
  
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  // Verificar novamente se ainda deve mostrar
  if (shouldShowAnnouncement(announcement)) {
    displayAnnouncementPopup(announcement);
    saveViewedAnnouncement(announcement.id, announcement);
  }
}

// 🚀 Inicialização ao carregar página
async function initExtensionAnnouncements() {
  const announcements = await fetchExtensionAnnouncements();
  
  for (const announcement of announcements) {
    if (shouldShowAnnouncement(announcement)) {
      showAnnouncementWithDelay(announcement);
      break; // Mostrar um aviso de cada vez
    }
  }
}

// Chamar quando a página do Instagram carregar
if (window.location.hostname.includes('instagram.com')) {
  initExtensionAnnouncements();
}`;

  // Criamos o popup visual code com as novas funcionalidades
  const popupCode = `// 🎨 Criar popup do aviso
function displayAnnouncementPopup(announcement) {
  // Remover popup existente se houver
  const existing = document.getElementById('mro-extension-popup');
  if (existing) existing.remove();
  
  const popup = document.createElement('div');
  popup.id = 'mro-extension-popup';
  
  const imageHtml = announcement.thumbnailUrl ? 
    \\\`<img src="\\\${announcement.thumbnailUrl}" style="width: 100%; max-height: 300px; object-fit: cover;" />\\\` : '';
    
  const buttonHtml = announcement.buttonUrl ? \\\`
    <a href="\\\${announcement.buttonUrl}" target="_blank" style="
      display: inline-block;
      margin-top: 16px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: transform 0.2s;
    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      \\\${announcement.buttonText || 'Saiba Mais'}
    </a>
  \\\` : '';
  
  const closeBtnHtml = !announcement.forceNotClose ? \\\`
    <button id="mro-close-btn" onclick="this.closest('#mro-extension-popup').remove()" style="
      display: block;
      width: 100%;
      margin-top: 16px;
      padding: 12px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.2);
      color: #a0aec0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    " onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#a0aec0'">
      Fechar
    </button>
  \\\` : \\\`
    <div style="
      margin-top: 16px;
      padding: 12px;
      text-align: center;
      color: #ff4d4d;
      font-size: 12px;
      font-weight: 600;
      border: 1px dashed rgba(255,77,77,0.3);
      border-radius: 8px;
      background: rgba(255,77,77,0.05);
    ">
      ⚠️ Este aviso é obrigatório e não pode ser fechado.
    </div>
  \\\`;

  popup.innerHTML = \\\`
    <div style="
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    ">
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        overflow: hidden;
        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1);
      ">
        \\\${imageHtml}
        <div style="padding: 24px;">
          <h2 style="color: #fff; font-size: 20px; font-weight: bold; margin-bottom: 12px;">\\\${announcement.title}</h2>
          <p style="color: #a0aec0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">\\\${announcement.content}</p>
          \\\${buttonHtml}
          \\\${closeBtnHtml}
        </div>
      </div>
    </div>
  \\\`;
  
  document.body.appendChild(popup);

  // Lógica de "Forçar Leitura"
  if (announcement.forceRead) {
    const closeBtn = document.getElementById('mro-close-btn');
    if (closeBtn) {
      const originalText = closeBtn.innerText;
      let seconds = announcement.forceReadSeconds || 5;
      closeBtn.disabled = true;
      closeBtn.style.opacity = '0.5';
      closeBtn.style.cursor = 'not-allowed';
      
      const timer = setInterval(() => {
        seconds--;
        closeBtn.innerText = \\\`Aguarde (\\\${seconds}s)\\\`;
        if (seconds <= 0) {
          clearInterval(timer);
          closeBtn.disabled = false;
          closeBtn.style.opacity = '1';
          closeBtn.style.cursor = 'pointer';
          closeBtn.innerText = originalText;
        }
      }, 1000);
    }
  }
}`;

  const dataStructure = `// 📦 Estrutura de dados do aviso
interface ExtensionAnnouncement {
  id: string;                    // ID único do aviso
  title: string;                 // Título do aviso
  content: string;               // Conteúdo/mensagem
  thumbnailUrl?: string;         // URL da imagem (opcional)
  buttonText?: string;           // Texto do botão CTA
  buttonUrl?: string;            // URL do botão CTA
  isActive: boolean;             // Se o aviso está ativo
  forceNotClose: boolean;        // Se verdadeiro, oculta o botão de fechar
  
  // ⏱️ Configurações de leitura e delay
  delaySeconds: number;          // Segundos para aguardar antes de mostrar
  forceRead: boolean;            // Se deve forçar a leitura (contador no botão)
  forceReadSeconds: number;      // Segundos de espera obrigatória
  
  // 🔄 Configurações de frequência
  frequencyType: 'once' | 'times_per_day' | 'times_per_hours';
  frequencyValue: number;        // Quantas vezes exibir
  frequencyHours?: number;       // Intervalo em horas (se times_per_hours)
  
  createdAt: string;
  updatedAt: string;
}`;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Documentação - Avisos para {label}</h2>
              <p className="text-sm text-muted-foreground">API e integração com {label.toLowerCase()}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="p-6 space-y-8">
          <section>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" /> Endpoint</h3>
            <div className="bg-secondary/50 rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <code className="text-sm text-green-400 break-all">{endpoint}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(endpoint, 'Endpoint')}>
                  {copiedSection === 'Endpoint' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Settings className="w-5 h-5 text-blue-500" /> Estrutura de Dados</h3>
            <div className="bg-secondary/50 rounded-lg p-4 relative">
              <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(dataStructure, 'Estrutura')}>
                {copiedSection === 'Estrutura' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">{dataStructure}</pre>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Bell className="w-5 h-5 text-purple-500" /> 1. Buscar Avisos</h3>
            <div className="bg-secondary/50 rounded-lg p-4 relative">
              <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(fetchCode, 'Buscar')}>
                {copiedSection === 'Buscar' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">{fetchCode}</pre>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Eye className="w-5 h-5 text-cyan-500" /> 2. Lógica de Exibição</h3>
            <div className="bg-secondary/50 rounded-lg p-4 relative">
              <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(displayLogicCode, 'Lógica')}>
                {copiedSection === 'Lógica' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="text-xs text-cyan-400 overflow-x-auto whitespace-pre-wrap">{displayLogicCode}</pre>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Code className="w-5 h-5 text-pink-500" /> 3. Popup Visual (Forçar Leitura/Não Fechar)</h3>
            <div className="bg-secondary/50 rounded-lg p-4 relative">
              <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(popupCode, 'Popup')}>
                {copiedSection === 'Popup' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="text-xs text-pink-400 overflow-x-auto whitespace-pre-wrap">{popupCode}</pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ExtensionAnnouncementDocs;