import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminLoggedIn, logoutAdmin, getAdminData, saveAdminData, AdminData, addTutorialStep, addVideoToStep, deleteTutorialStep, deleteVideo } from '@/lib/adminConfig';
import { getSession } from '@/lib/storage';
import { getUserSession } from '@/lib/userStorage';
import { getSyncData, SyncedInstagramProfile, SyncData, getAllMergedProfiles } from '@/lib/syncStorage';
import { ProfileSession, MROSession } from '@/types/instagram';
import type { UserSession } from '@/types/user';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import SyncDashboard from '@/components/admin/SyncDashboard';
import { 
  Users, Settings, Video, LogOut, Search, Download, 
  Eye, TrendingUp, Calendar, Sparkles, Plus, Trash2,
  Save, RefreshCw, Check, X, Play, ExternalLink,
  Image as ImageIcon, BarChart3, User, CloudDownload,
  Instagram, Filter, CheckCircle, XCircle
} from 'lucide-react';

type Tab = 'users' | 'sync' | 'tutorials' | 'settings';
type UserFilter = 'all' | 'instagram' | 'connected';

interface PrintSettings {
  color: string;
  showGrowth: boolean;
}

const PRINT_COLORS = [
  { name: 'Primário', value: 'from-primary/20 to-mro-cyan/20', border: 'border-primary' },
  { name: 'Cyan', value: 'from-mro-cyan/20 to-mro-cyan/40', border: 'border-mro-cyan' },
  { name: 'Roxo', value: 'from-mro-purple/20 to-mro-purple/40', border: 'border-mro-purple' },
  { name: 'Dourado', value: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500' },
  { name: 'Verde', value: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500' },
  { name: 'Rosa', value: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500' },
];

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [session, setSession] = useState<MROSession | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [syncData, setSyncData] = useState<SyncData>(getSyncData());
  const [adminData, setAdminData] = useState<AdminData>(getAdminData());
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [selectedSyncedProfile, setSelectedSyncedProfile] = useState<SyncedInstagramProfile | null>(null);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    color: PRINT_COLORS[0].value,
    showGrowth: true
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Tutorial state
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newVideoData, setNewVideoData] = useState({
    stepId: '',
    title: '',
    description: '',
    youtubeUrl: '',
    thumbnailUrl: ''
  });
  const [showAddVideo, setShowAddVideo] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState(adminData.settings);
  const [testingApi, setTestingApi] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('/admin/login');
      return;
    }
    
    // Load sessions
    const mroSession = getSession();
    const userSess = getUserSession();
    const syncedData = getSyncData();
    setSession(mroSession);
    setUserSession(userSess);
    setSyncData(syncedData);
    
    // Load saved settings
    const savedData = getAdminData();
    setAdminData(savedData);
    setSettings(savedData.settings);

    // Refresh sync data periodically
    const interval = setInterval(() => {
      setSyncData(getSyncData());
    }, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  // Refresh user list
  const refreshUserList = () => {
    setIsRefreshing(true);
    setSyncData(getSyncData());
    toast({ title: "Lista atualizada!", description: `${getAllMergedProfiles().length} perfis encontrados` });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter profiles matching search
  const filteredProfiles = session?.profiles.filter(p => 
    p.profile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.profile.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (userSession?.user?.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filter synced profiles (merged with dashboard profiles)
  const allMergedProfiles = getAllMergedProfiles();
  
  const filteredSyncedProfiles = allMergedProfiles.filter(p => {
    const matchesSearch = p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ownerUserName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (userFilter === 'connected') return p.isConnectedToDashboard;
    if (userFilter === 'instagram') return true;
    return true;
  });

  // Get combined count for stats
  const totalSyncedProfiles = allMergedProfiles.length;
  const connectedProfiles = allMergedProfiles.filter(p => p.isConnectedToDashboard).length;
  const notConnectedProfiles = allMergedProfiles.filter(p => !p.isConnectedToDashboard).length;

  // Calculate growth for synced profile
  const getSyncedProfileGrowth = (profile: SyncedInstagramProfile) => {
    if (profile.growthHistory.length < 2) return 0;
    const first = profile.growthHistory[0].followers;
    const last = profile.growthHistory[profile.growthHistory.length - 1].followers;
    return last - first;
  };

  // Get the user info who registered this instagram
  const getRegisteredUserInfo = (username: string) => {
    if (!userSession?.user) return null;
    const registeredIG = userSession.user.registeredIGs.find(
      ig => ig.username.toLowerCase() === username.toLowerCase()
    );
    return registeredIG ? {
      ownerName: userSession.user.username,
      email: registeredIG.email,
      registeredAt: registeredIG.registeredAt,
      syncedFromSquare: registeredIG.syncedFromSquare
    } : null;
  };

  const handleSaveSettings = () => {
    const updatedData = { ...adminData, settings };
    saveAdminData(updatedData);
    setAdminData(updatedData);
    toast({ title: "Configurações salvas!", description: "Todas as alterações foram salvas." });
  };

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return;
    const newStep = addTutorialStep(newStepTitle);
    setAdminData(getAdminData());
    setNewStepTitle('');
    toast({ title: "Etapa adicionada!", description: newStep.title });
  };

  const handleAddVideo = (stepId: string) => {
    if (!newVideoData.title || !newVideoData.youtubeUrl) {
      toast({ title: "Erro", description: "Preencha título e URL do YouTube", variant: "destructive" });
      return;
    }
    
    const step = adminData.tutorials.find(s => s.id === stepId);
    addVideoToStep(stepId, {
      title: newVideoData.title,
      description: newVideoData.description,
      youtubeUrl: newVideoData.youtubeUrl,
      thumbnailUrl: newVideoData.thumbnailUrl || getYoutubeThumbnail(newVideoData.youtubeUrl),
      order: (step?.videos.length || 0) + 1
    });
    
    setAdminData(getAdminData());
    setNewVideoData({ stepId: '', title: '', description: '', youtubeUrl: '', thumbnailUrl: '' });
    setShowAddVideo(null);
    toast({ title: "Vídeo adicionado!" });
  };

  const handleDeleteStep = (stepId: string) => {
    if (confirm('Tem certeza que deseja excluir esta etapa e todos os vídeos?')) {
      deleteTutorialStep(stepId);
      setAdminData(getAdminData());
      toast({ title: "Etapa excluída!" });
    }
  };

  const handleDeleteVideo = (stepId: string, videoId: string) => {
    if (confirm('Excluir este vídeo?')) {
      deleteVideo(stepId, videoId);
      setAdminData(getAdminData());
      toast({ title: "Vídeo excluído!" });
    }
  };

  const getYoutubeThumbnail = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
    return '';
  };

  const testApi = async (apiName: string, apiKey: string) => {
    setTestingApi(apiName);
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (apiKey && apiKey.length > 10) {
      toast({ title: `${apiName} OK!`, description: "API funcionando corretamente" });
    } else {
      toast({ title: `${apiName} Erro`, description: "Chave inválida ou vazia", variant: "destructive" });
    }
    
    setTestingApi(null);
  };

  const downloadPrint = async () => {
    if (!printRef.current) return;
    
    try {
      const canvas = await html2canvas(printRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `cliente-ativo-${selectedProfile}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({ title: "Print baixado!", description: "Imagem salva com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao gerar print", variant: "destructive" });
    }
  };

  const getSelectedColorBorder = () => {
    const selectedColorObj = PRINT_COLORS.find(c => c.value === printSettings.color);
    return selectedColorObj?.border || 'border-primary';
  };

  const tabs = [
    { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" /> },
    { id: 'sync', label: 'Sincronizar', icon: <CloudDownload className="w-4 h-4" /> },
    { id: 'tutorials', label: 'MRO Ferramenta', icon: <Video className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
  ];

  const getSelectedProfileData = () => {
    return session?.profiles.find(p => p.id === selectedProfile);
  };

  const calculateGrowth = (profileData: ProfileSession) => {
    if (profileData.growthHistory.length < 2) return 0;
    const first = profileData.growthHistory[0].followers;
    const last = profileData.growthHistory[profileData.growthHistory.length - 1].followers;
    return last - first;
  };

  const getNextStrategyDate = (profileData: ProfileSession) => {
    if (profileData.strategies.length === 0) return null;
    const lastStrategy = profileData.strategies[profileData.strategies.length - 1];
    const lastDate = new Date(lastStrategy.createdAt);
    const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);
    return nextMonth;
  };

  const getDaysUntilNextStrategy = (profileData: ProfileSession) => {
    const nextDate = getNextStrategyDate(profileData);
    if (!nextDate) return 0;
    const now = new Date();
    const diff = nextDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (!isAdminLoggedIn()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <span className="text-sm font-medium text-primary">Admin Panel</span>
            </div>

            <nav className="flex items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            <Button type="button" variant="outline" size="sm" onClick={handleLogout} className="cursor-pointer">
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline ml-2">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="glass-card p-4 text-center">
                <Instagram className="w-6 h-6 mx-auto text-pink-500 mb-2" />
                <p className="text-2xl font-bold">{totalSyncedProfiles}</p>
                <p className="text-xs text-muted-foreground">Perfis Instagram Total</p>
              </div>
              <div className="glass-card p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{connectedProfiles}</p>
                <p className="text-xs text-muted-foreground">Conectados Dashboard</p>
              </div>
              <div className="glass-card p-4 text-center">
                <XCircle className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">{notConnectedProfiles}</p>
                <p className="text-xs text-muted-foreground">Não Conectados</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Users className="w-6 h-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{syncData.users.length}</p>
                <p className="text-xs text-muted-foreground">Usuários SquareCloud</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-display font-bold">Perfis Instagram</h2>
                {/* Refresh Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refreshUserList}
                  className="cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Atualizar Lista
                </Button>
                {syncData.currentlySyncing && (
                  <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full animate-pulse">
                    Sincronizando: @{syncData.currentlySyncing}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Filter Buttons */}
                <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setUserFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                      userFilter === 'all' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('instagram')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                      userFilter === 'instagram' 
                        ? 'bg-pink-500 text-white' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Instagram className="w-4 h-4 inline mr-1" />
                    Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('connected')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                      userFilter === 'connected' 
                        ? 'bg-green-500 text-white' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Cadastrados
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por @username ou usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-72 bg-secondary/50"
                  />
                </div>
              </div>
            </div>

            {selectedProfile || selectedSyncedProfile ? (
              // Profile Detail View
              <div className="space-y-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setSelectedProfile(null); setSelectedSyncedProfile(null); }} 
                  className="cursor-pointer"
                >
                  ← Voltar para lista
                </Button>
                
                {/* Dashboard Connected Profile View */}
                {selectedProfile && (() => {
                  const profileData = getSelectedProfileData();
                  if (!profileData) return null;
                  
                  const userInfo = getRegisteredUserInfo(profileData.profile.username);
                  const growth = calculateGrowth(profileData);
                  const daysUntilNext = getDaysUntilNextStrategy(profileData);
                  
                  return (
                    <div className="grid gap-6">
                      {/* Profile Header */}
                      <div className="glass-card p-6">
                        <div className="flex items-start gap-6">
                          <img 
                            src={profileData.profile.profilePicUrl}
                            alt={profileData.profile.username}
                            className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                            onError={(e) => {
                              e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profileData.profile.username}`;
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="text-2xl font-display font-bold">@{profileData.profile.username}</h3>
                            <p className="text-muted-foreground">{profileData.profile.fullName}</p>
                            <p className="text-sm mt-2">{profileData.profile.bio}</p>
                            <div className="flex gap-4 mt-4 text-sm">
                              <span><strong>{profileData.profile.followers.toLocaleString()}</strong> seguidores</span>
                              <span><strong>{profileData.profile.following.toLocaleString()}</strong> seguindo</span>
                              <span><strong>{profileData.profile.posts}</strong> posts</span>
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground space-y-2">
                            {userInfo && (
                              <div className="p-3 rounded-lg bg-primary/10 mb-3">
                                <p className="text-xs text-muted-foreground">Cadastrado por:</p>
                                <p className="font-semibold text-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {userInfo.ownerName}
                                </p>
                                <p className="text-xs">{userInfo.email}</p>
                              </div>
                            )}
                            <p>Cadastrado em:</p>
                            <p className="font-medium text-foreground">{new Date(profileData.startedAt).toLocaleDateString('pt-BR')}</p>
                            <p className="mt-2">Último acesso:</p>
                            <p className="font-medium text-foreground">{new Date(profileData.lastUpdated).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Strategy Countdown */}
                      {profileData.strategies.length > 0 && (
                        <div className="glass-card p-4 border-l-4 border-primary">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Próxima estratégia disponível em:</p>
                              <p className="text-2xl font-bold text-primary">
                                {daysUntilNext > 0 ? `${daysUntilNext} dias` : 'Disponível agora!'}
                              </p>
                            </div>
                            <Calendar className="w-10 h-10 text-primary/50" />
                          </div>
                        </div>
                      )}

                      {/* Cliente Ativo Card for Download */}
                      <div className="glass-card p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-primary" />
                          Print Cliente Ativo (Stories)
                        </h4>
                        
                        {/* Print Customization */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div>
                            <Label className="text-sm mb-2 block">Cor do Print</Label>
                            <div className="flex flex-wrap gap-2">
                              {PRINT_COLORS.map((color) => (
                                <button
                                  key={color.value}
                                  type="button"
                                  onClick={() => setPrintSettings(prev => ({ ...prev, color: color.value }))}
                                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${color.value} border-2 transition-all cursor-pointer ${
                                    printSettings.color === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border'
                                  }`}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={printSettings.showGrowth}
                              onCheckedChange={(checked) => setPrintSettings(prev => ({ ...prev, showGrowth: checked }))}
                            />
                            <Label className="text-sm">Mostrar +seguidores</Label>
                          </div>
                        </div>

                        {/* Print Preview */}
                        <div 
                          ref={printRef}
                          className={`bg-gradient-to-br ${printSettings.color} p-6 rounded-lg aspect-[9/16] max-w-xs mx-auto flex flex-col items-center justify-center text-center`}
                        >
                          <img 
                            src={profileData.profile.profilePicUrl}
                            alt={profileData.profile.username}
                            className={`w-20 h-20 rounded-full object-cover border-4 ${getSelectedColorBorder()} mb-4`}
                            onError={(e) => {
                              e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profileData.profile.username}`;
                            }}
                          />
                          <p className="text-2xl font-display font-bold text-primary">CLIENTE ATIVO</p>
                          <p className="text-lg font-semibold mt-2">@{profileData.profile.username}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {profileData.profile.followers.toLocaleString()} seguidores
                          </p>
                          <p className="text-sm text-muted-foreground mt-4">
                            Desde {new Date(profileData.startedAt).toLocaleDateString('pt-BR')}
                          </p>
                          {printSettings.showGrowth && growth > 0 && (
                            <div className="mt-4 p-3 bg-primary/20 rounded-lg">
                              <p className="text-sm font-bold text-primary">+{growth.toLocaleString()} seguidores</p>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full mt-4 cursor-pointer"
                          onClick={downloadPrint}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar Print Stories
                        </Button>
                      </div>

                      {/* Growth Chart */}
                      <div className="glass-card p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          Crescimento desde o cadastro
                        </h4>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="p-4 rounded-lg bg-primary/10 text-center">
                            <p className="text-2xl font-bold text-primary">
                              {growth > 0 ? `+${growth.toLocaleString()}` : growth.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Novos Seguidores</p>
                          </div>
                          <div className="p-4 rounded-lg bg-mro-cyan/10 text-center">
                            <p className="text-2xl font-bold text-mro-cyan">
                              {profileData.strategies.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Estratégias Geradas</p>
                          </div>
                          <div className="p-4 rounded-lg bg-mro-purple/10 text-center">
                            <p className="text-2xl font-bold text-mro-purple">
                              {profileData.creatives.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Criativos Gerados</p>
                          </div>
                        </div>
                        
                        {/* Growth Timeline */}
                        <div className="space-y-2">
                          {profileData.growthHistory.slice(-12).map((snapshot, i) => (
                            <div key={i} className="flex items-center gap-4 text-sm">
                              <span className="w-24 text-muted-foreground">
                                {new Date(snapshot.date).toLocaleDateString('pt-BR')}
                              </span>
                              <div className="flex-1 h-4 bg-secondary/50 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-mro-cyan rounded-full transition-all"
                                  style={{ 
                                    width: `${Math.min(100, (snapshot.followers / (profileData.growthHistory[profileData.growthHistory.length - 1]?.followers || 1)) * 100)}%` 
                                  }}
                                />
                              </div>
                              <span className="w-24 text-right font-medium">
                                {snapshot.followers.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strategies */}
                      <div className="glass-card p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          Estratégias Geradas ({profileData.strategies.length})
                        </h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {profileData.strategies.map((strategy) => (
                            <div key={strategy.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">{strategy.type}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(strategy.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <p className="font-medium">{strategy.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
                              
                              {/* Show posts calendar if available */}
                              {strategy.postsCalendar && strategy.postsCalendar.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <p className="text-xs font-medium mb-2">Posts gerados ({strategy.postsCalendar.length}):</p>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    {strategy.postsCalendar.slice(0, 6).map((post, idx) => (
                                      <div key={idx} className="p-2 bg-background/50 rounded text-center">
                                        <p className="text-muted-foreground">{post.date}</p>
                                        <p className="truncate">{post.postType}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {profileData.strategies.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">Nenhuma estratégia gerada ainda</p>
                          )}
                        </div>
                      </div>

                      {/* Creatives */}
                      <div className="glass-card p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-primary" />
                          Criativos Gerados ({profileData.creatives.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {profileData.creatives.map((creative) => (
                            <div key={creative.id} className="relative aspect-square rounded-lg overflow-hidden group">
                              <img 
                                src={creative.imageUrl} 
                                alt={creative.headline}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                                <p className="text-xs font-medium">{creative.headline}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(creative.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          ))}
                          {profileData.creatives.length === 0 && (
                            <p className="text-muted-foreground text-center py-4 col-span-full">Nenhum criativo gerado ainda</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Synced Profile View (not connected to dashboard) */}
                {selectedSyncedProfile && (
                  <div className="grid gap-6">
                    {/* Profile Header */}
                    <div className="glass-card p-6">
                      <div className="flex items-start gap-6">
                        <img 
                          src={selectedSyncedProfile.profilePicUrl}
                          alt={selectedSyncedProfile.username}
                          className={`w-24 h-24 rounded-full object-cover border-2 ${
                            selectedSyncedProfile.isConnectedToDashboard ? 'border-green-500' : 'border-yellow-500'
                          }`}
                          onError={(e) => {
                            e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${selectedSyncedProfile.username}`;
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-display font-bold">@{selectedSyncedProfile.username}</h3>
                            {selectedSyncedProfile.isConnectedToDashboard ? (
                              <span className="px-2 py-1 rounded bg-green-500/20 text-green-500 text-xs font-medium">
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Conectado
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 text-xs font-medium">
                                <XCircle className="w-3 h-3 inline mr-1" />
                                Não conectado
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground">{selectedSyncedProfile.fullName}</p>
                          <p className="text-sm mt-2">{selectedSyncedProfile.bio}</p>
                          <div className="flex gap-4 mt-4 text-sm">
                            <span><strong>{selectedSyncedProfile.followers.toLocaleString()}</strong> seguidores</span>
                            <span><strong>{selectedSyncedProfile.following.toLocaleString()}</strong> seguindo</span>
                            <span><strong>{selectedSyncedProfile.posts}</strong> posts</span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground space-y-2">
                          <div className="p-3 rounded-lg bg-primary/10 mb-3">
                            <p className="text-xs text-muted-foreground">Usuário SquareCloud:</p>
                            <p className="font-semibold text-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {selectedSyncedProfile.ownerUserName}
                            </p>
                          </div>
                          <p>Sincronizado em:</p>
                          <p className="font-medium text-foreground">{new Date(selectedSyncedProfile.syncedAt).toLocaleDateString('pt-BR')}</p>
                          <p className="mt-2">Última atualização:</p>
                          <p className="font-medium text-foreground">{new Date(selectedSyncedProfile.lastUpdated).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Growth Stats */}
                    <div className="glass-card p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Crescimento
                      </h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 rounded-lg bg-primary/10 text-center">
                          <p className="text-2xl font-bold text-primary">
                            {getSyncedProfileGrowth(selectedSyncedProfile) > 0 
                              ? `+${getSyncedProfileGrowth(selectedSyncedProfile).toLocaleString()}` 
                              : getSyncedProfileGrowth(selectedSyncedProfile).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Novos Seguidores</p>
                        </div>
                        <div className="p-4 rounded-lg bg-mro-cyan/10 text-center">
                          <p className="text-2xl font-bold text-mro-cyan">
                            {selectedSyncedProfile.growthHistory.length}
                          </p>
                          <p className="text-xs text-muted-foreground">Snapshots</p>
                        </div>
                      </div>
                      
                      {/* Growth Timeline */}
                      {selectedSyncedProfile.growthHistory.length > 0 && (
                        <div className="space-y-2">
                          {selectedSyncedProfile.growthHistory.slice(-12).map((snapshot, i) => (
                            <div key={i} className="flex items-center gap-4 text-sm">
                              <span className="w-24 text-muted-foreground">
                                {new Date(snapshot.date).toLocaleDateString('pt-BR')}
                              </span>
                              <div className="flex-1 h-4 bg-secondary/50 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-mro-cyan rounded-full transition-all"
                                  style={{ 
                                    width: `${Math.min(100, (snapshot.followers / (selectedSyncedProfile.growthHistory[selectedSyncedProfile.growthHistory.length - 1]?.followers || 1)) * 100)}%` 
                                  }}
                                />
                              </div>
                              <span className="w-24 text-right font-medium">
                                {snapshot.followers.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cliente Ativo Card for Download */}
                    <div className="glass-card p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        Print Cliente Ativo (Stories)
                      </h4>
                      
                      {/* Print Customization */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <Label className="text-sm mb-2 block">Cor do Print</Label>
                          <div className="flex flex-wrap gap-2">
                            {PRINT_COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => setPrintSettings(prev => ({ ...prev, color: color.value }))}
                                className={`w-8 h-8 rounded-full bg-gradient-to-br ${color.value} border-2 transition-all cursor-pointer ${
                                  printSettings.color === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border'
                                }`}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={printSettings.showGrowth}
                            onCheckedChange={(checked) => setPrintSettings(prev => ({ ...prev, showGrowth: checked }))}
                          />
                          <Label className="text-sm">Mostrar +seguidores</Label>
                        </div>
                      </div>

                      {/* Print Preview */}
                      <div 
                        ref={printRef}
                        className={`bg-gradient-to-br ${printSettings.color} p-6 rounded-lg aspect-[9/16] max-w-xs mx-auto flex flex-col items-center justify-center text-center`}
                      >
                        <img 
                          src={selectedSyncedProfile.profilePicUrl}
                          alt={selectedSyncedProfile.username}
                          className={`w-20 h-20 rounded-full object-cover border-4 ${getSelectedColorBorder()} mb-4`}
                          onError={(e) => {
                            e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${selectedSyncedProfile.username}`;
                          }}
                        />
                        <p className="text-2xl font-display font-bold text-primary">CLIENTE ATIVO</p>
                        <p className="text-lg font-semibold mt-2">@{selectedSyncedProfile.username}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedSyncedProfile.followers.toLocaleString()} seguidores
                        </p>
                        <p className="text-sm text-muted-foreground mt-4">
                          {new Date().toLocaleDateString('pt-BR')}
                        </p>
                        {printSettings.showGrowth && getSyncedProfileGrowth(selectedSyncedProfile) > 0 && (
                          <div className="mt-4 p-3 bg-primary/20 rounded-lg">
                            <p className="text-sm font-bold text-primary">+{getSyncedProfileGrowth(selectedSyncedProfile).toLocaleString()} seguidores</p>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full mt-4 cursor-pointer"
                        onClick={downloadPrint}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Print Stories
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Profile List View - Show synced profiles
              <div className="grid gap-4">
                {filteredSyncedProfiles.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <Instagram className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm 
                        ? 'Nenhum perfil encontrado com esse termo' 
                        : 'Nenhum perfil sincronizado ainda. Vá para a aba "Sincronizar" para buscar perfis.'}
                    </p>
                  </div>
                ) : (
                  filteredSyncedProfiles.map((profile) => {
                    const growth = getSyncedProfileGrowth(profile);
                    
                    return (
                      <div 
                        key={profile.username} 
                        className={`glass-card p-4 hover:border-primary/50 transition-colors cursor-pointer ${
                          profile.isConnectedToDashboard ? 'border-l-4 border-l-green-500' : ''
                        }`}
                        onClick={() => setSelectedSyncedProfile(profile)}
                      >
                        <div className="flex items-center gap-4">
                          <img 
                            src={profile.profilePicUrl}
                            alt={profile.username}
                            className={`w-16 h-16 rounded-full object-cover border-2 ${
                              profile.isConnectedToDashboard ? 'border-green-500' : 'border-border'
                            }`}
                            onError={(e) => {
                              e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`;
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">@{profile.username}</p>
                              {profile.isConnectedToDashboard ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-500 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Cadastrado
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-500 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Não conectado
                                </span>
                              )}
                              <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                                <User className="w-3 h-3 inline mr-1" />
                                {profile.ownerUserName}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{profile.fullName}</p>
                            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                              <span>{profile.followers.toLocaleString()} seguidores</span>
                              <span>{profile.following.toLocaleString()} seguindo</span>
                              <span>{profile.posts} posts</span>
                              {growth > 0 && (
                                <span className="text-green-500 font-medium">+{growth.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">Última atualização</p>
                            <p className="font-medium">{new Date(profile.lastUpdated).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <Eye className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <SyncDashboard />
        )}

        {/* Tutorials Tab */}
        {activeTab === 'tutorials' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold">MRO Ferramenta - Tutoriais</h2>
            </div>

            {/* Add New Step */}
            <div className="glass-card p-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Nome da nova etapa..."
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  className="bg-secondary/50"
                />
                <Button type="button" onClick={handleAddStep} disabled={!newStepTitle.trim()} className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Etapa
                </Button>
              </div>
            </div>

            {/* Download Link */}
            <div className="glass-card p-4">
              <Label className="mb-2 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Link de Download (Área de Membros)
              </Label>
              <div className="flex gap-3">
                <Input
                  placeholder="https://..."
                  value={settings.downloadLink}
                  onChange={(e) => setSettings(prev => ({ ...prev, downloadLink: e.target.value }))}
                  className="bg-secondary/50"
                />
                <Button type="button" onClick={handleSaveSettings} className="cursor-pointer">
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Tutorial Steps */}
            <div className="space-y-6">
              {adminData.tutorials.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma etapa criada ainda</p>
                </div>
              ) : (
                adminData.tutorials.map((step) => (
                  <div key={step.id} className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                          {step.order}
                        </span>
                        {step.title}
                      </h3>
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowAddVideo(showAddVideo === step.id ? null : step.id)}
                          className="cursor-pointer"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Vídeo
                        </Button>
                        <Button 
                          type="button"
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteStep(step.id)}
                          className="cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Add Video Form */}
                    {showAddVideo === step.id && (
                      <div className="p-4 rounded-lg bg-secondary/30 mb-4 space-y-3">
                        <Input
                          placeholder="Título do vídeo"
                          value={newVideoData.title}
                          onChange={(e) => setNewVideoData(prev => ({ ...prev, title: e.target.value }))}
                          className="bg-secondary/50"
                        />
                        <Input
                          placeholder="URL do YouTube"
                          value={newVideoData.youtubeUrl}
                          onChange={(e) => setNewVideoData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                          className="bg-secondary/50"
                        />
                        <Textarea
                          placeholder="Descrição (opcional)"
                          value={newVideoData.description}
                          onChange={(e) => setNewVideoData(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-secondary/50"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button type="button" onClick={() => handleAddVideo(step.id)} className="cursor-pointer">
                            <Check className="w-4 h-4 mr-1" />
                            Adicionar
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setShowAddVideo(null)} className="cursor-pointer">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Video List */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {step.videos.map((video) => (
                        <div key={video.id} className="relative group">
                          <div className="aspect-video rounded-lg overflow-hidden bg-secondary">
                            <img 
                              src={video.thumbnailUrl || getYoutubeThumbnail(video.youtubeUrl)}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/320x180?text=Video';
                              }}
                            />
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-8 h-8 text-primary" />
                            </div>
                          </div>
                          <p className="text-sm font-medium mt-2 truncate">{video.title}</p>
                          <button
                            type="button"
                            onClick={() => handleDeleteVideo(step.id, video.id)}
                            className="absolute top-2 right-2 w-6 h-6 bg-destructive rounded-full items-center justify-center hidden group-hover:flex cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-destructive-foreground" />
                          </button>
                        </div>
                      ))}
                      {step.videos.length === 0 && (
                        <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                          Nenhum vídeo nesta etapa
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-display font-bold">Configurações</h2>

            {/* API Keys */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                APIs de I.A da MRO
              </h3>

              <div className="space-y-4">
                <div>
                  <Label>DeepSeek API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="password"
                      value={settings.apis.deepseek}
                      onChange={(e) => setSettings(prev => ({ ...prev, apis: { ...prev.apis, deepseek: e.target.value }}))}
                      placeholder="sk-..."
                      className="bg-secondary/50"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => testApi('DeepSeek', settings.apis.deepseek)}
                      disabled={testingApi === 'DeepSeek'}
                      className="cursor-pointer"
                    >
                      {testingApi === 'DeepSeek' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                  {settings.apis.deepseek && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Chave salva
                    </p>
                  )}
                </div>

                <div>
                  <Label>Gemini API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="password"
                      value={settings.apis.gemini}
                      onChange={(e) => setSettings(prev => ({ ...prev, apis: { ...prev.apis, gemini: e.target.value }}))}
                      placeholder="AIza..."
                      className="bg-secondary/50"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => testApi('Gemini', settings.apis.gemini)}
                      disabled={testingApi === 'Gemini'}
                      className="cursor-pointer"
                    >
                      {testingApi === 'Gemini' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                  {settings.apis.gemini && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Chave salva
                    </p>
                  )}
                </div>

                <div>
                  <Label>Nano Banana (Gemini Image) API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="password"
                      value={settings.apis.nanoBanana}
                      onChange={(e) => setSettings(prev => ({ ...prev, apis: { ...prev.apis, nanoBanana: e.target.value }}))}
                      placeholder="..."
                      className="bg-secondary/50"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => testApi('Nano Banana', settings.apis.nanoBanana)}
                      disabled={testingApi === 'Nano Banana'}
                      className="cursor-pointer"
                    >
                      {testingApi === 'Nano Banana' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                  {settings.apis.nanoBanana && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Chave salva
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Facebook Pixel */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" />
                Facebook Pixel
              </h3>

              <div>
                <Label>Código do Pixel</Label>
                <Textarea
                  value={settings.facebookPixel}
                  onChange={(e) => setSettings(prev => ({ ...prev, facebookPixel: e.target.value }))}
                  placeholder="Cole o código completo do Facebook Pixel aqui..."
                  className="bg-secondary/50 mt-1 font-mono text-xs"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cole o script completo do Facebook Pixel para rastreamento
                </p>
              </div>
            </div>

            {/* Save Button */}
            <Button type="button" onClick={handleSaveSettings} variant="gradient" size="lg" className="w-full cursor-pointer">
              <Save className="w-5 h-5 mr-2" />
              Salvar Todas as Configurações
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
