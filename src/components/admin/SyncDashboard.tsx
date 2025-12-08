import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getSyncData, 
  saveSyncData, 
  SyncData, 
  SyncedInstagramProfile,
  SquareCloudUser,
  wasProfileSyncedToday,
  updateProfile,
  getTopGrowingProfiles
} from '@/lib/syncStorage';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, Play, Pause, Users, TrendingUp, Instagram, 
  CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, User
} from 'lucide-react';

const SQUARECLOUD_API = 'https://dashboardmroinstagramvini-online.squareweb.app';
const CUSTOM_API_BASE = 'http://72.62.9.229:8000';

const SyncDashboard = () => {
  const { toast } = useToast();
  const [syncData, setSyncData] = useState<SyncData>(getSyncData());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load data on mount
  useEffect(() => {
    setSyncData(getSyncData());
  }, []);

  // Fetch users from SquareCloud
  const fetchSquareCloudUsers = async (): Promise<SquareCloudUser[]> => {
    try {
      const response = await fetch(`${SQUARECLOUD_API}/obter-usuarios`);
      const text = await response.text();
      const data = JSON.parse(text);
      
      if (!data.success || !Array.isArray(data.usuarios)) {
        throw new Error('Invalid response format');
      }
      
      return data.usuarios.map((u: any) => ({
        ID: u.ID,
        numero: u.data?.numero || '',
        dataDeExpiracao: u.data?.dataDeExpiracao ?? 0,
        blackList: u.data?.blackList || false,
        igInstagram: u.data?.igInstagram || []
      }));
    } catch (error) {
      console.error('Error fetching SquareCloud users:', error);
      throw error;
    }
  };

  // Fetch Instagram profile data
  const fetchInstagramProfile = async (username: string): Promise<Partial<SyncedInstagramProfile> | null> => {
    try {
      const response = await fetch(`${CUSTOM_API_BASE}/profile/${username}`);
      
      if (!response.ok) {
        console.log(`Profile ${username} not found`);
        return null;
      }
      
      const data = await response.json();
      
      return {
        username: data.username || username,
        followers: data.followers || 0,
        following: data.following || 0,
        posts: data.posts || 0,
        profilePicUrl: data.profile_picture 
          ? `https://images.weserv.nl/?url=${encodeURIComponent(data.profile_picture)}&w=200&h=200&fit=cover`
          : `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
        fullName: data.full_name || username,
        bio: data.bio || ''
      };
    } catch (error) {
      console.error(`Error fetching Instagram profile ${username}:`, error);
      return null;
    }
  };

  // Check if profile is connected to main dashboard
  const checkDashboardConnection = (username: string): boolean => {
    try {
      const session = localStorage.getItem('mro_session');
      if (!session) return false;
      
      const parsed = JSON.parse(session);
      return parsed.profiles?.some((p: any) => 
        p.profile?.username?.toLowerCase() === username.toLowerCase()
      ) || false;
    } catch {
      return false;
    }
  };

  // Start full sync
  const startFullSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    abortControllerRef.current = new AbortController();
    
    try {
      toast({ title: "Iniciando sincronização...", description: "Buscando usuários do SquareCloud" });
      
      // Step 1: Fetch users
      const users = await fetchSquareCloudUsers();
      
      // Step 2: Collect all Instagram usernames
      const allInstagramUsernames: { username: string; ownerId: string; ownerName: string }[] = [];
      users.forEach(user => {
        user.igInstagram.forEach(ig => {
          allInstagramUsernames.push({
            username: ig.replace('@', '').toLowerCase(),
            ownerId: user.ID,
            ownerName: user.ID
          });
        });
      });
      
      // Step 3: Update sync data with users
      const updatedData: SyncData = {
        ...syncData,
        users,
        lastSyncDate: new Date().toISOString(),
        totalProfilesCount: allInstagramUsernames.length,
        syncQueue: allInstagramUsernames.map(u => u.username),
        isPaused: false
      };
      
      saveSyncData(updatedData);
      setSyncData(updatedData);
      
      toast({ 
        title: "Usuários carregados!", 
        description: `${users.length} usuários, ${allInstagramUsernames.length} perfis Instagram` 
      });
      
      // Step 4: Start syncing profiles one by one
      await syncProfiles(allInstagramUsernames);
      
    } catch (error) {
      toast({ 
        title: "Erro na sincronização", 
        description: "Falha ao buscar dados do SquareCloud",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync profiles one by one with random delays
  const syncProfiles = async (profiles: { username: string; ownerId: string; ownerName: string }[]) => {
    const currentData = getSyncData();
    
    for (let i = 0; i < profiles.length; i++) {
      // Check if paused or aborted
      if (currentData.isPaused || abortControllerRef.current?.signal.aborted) {
        toast({ title: "Sincronização pausada", description: `${i}/${profiles.length} perfis sincronizados` });
        return;
      }
      
      const { username, ownerId, ownerName } = profiles[i];
      
      // Skip if already synced today
      if (wasProfileSyncedToday(username)) {
        console.log(`Skipping ${username} - already synced today`);
        continue;
      }
      
      setSyncProgress({ current: i + 1, total: profiles.length });
      
      // Update currently syncing
      const updatingData = getSyncData();
      updatingData.currentlySyncing = username;
      updatingData.syncQueue = profiles.slice(i + 1).map(p => p.username);
      saveSyncData(updatingData);
      setSyncData(updatingData);
      
      // Fetch profile data
      const profileData = await fetchInstagramProfile(username);
      
      if (profileData) {
        const isConnected = checkDashboardConnection(username);
        
        const fullProfile: SyncedInstagramProfile = {
          ...profileData as SyncedInstagramProfile,
          ownerUserId: ownerId,
          ownerUserName: ownerName,
          syncedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          isConnectedToDashboard: isConnected,
          growthHistory: []
        };
        
        updateProfile(fullProfile);
        setSyncData(getSyncData());
      }
      
      // Random delay between 2-5 seconds to avoid overloading
      const delay = Math.floor(Math.random() * 3000) + 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Mark full sync complete
    const finalData = getSyncData();
    finalData.lastFullSyncDate = new Date().toISOString();
    finalData.currentlySyncing = null;
    finalData.syncQueue = [];
    saveSyncData(finalData);
    setSyncData(finalData);
    
    toast({ 
      title: "Sincronização concluída!", 
      description: `${profiles.length} perfis processados` 
    });
  };

  // Pause/Resume sync
  const togglePause = () => {
    const data = getSyncData();
    data.isPaused = !data.isPaused;
    saveSyncData(data);
    setSyncData(data);
    
    if (data.isPaused) {
      abortControllerRef.current?.abort();
      toast({ title: "Sincronização pausada" });
    } else {
      toast({ title: "Retomando sincronização..." });
      // Resume from queue
      const queue = data.syncQueue.map(username => ({
        username,
        ownerId: data.users.find(u => u.igInstagram.includes(username))?.ID || '',
        ownerName: data.users.find(u => u.igInstagram.includes(username))?.ID || ''
      }));
      if (queue.length > 0) {
        setIsSyncing(true);
        abortControllerRef.current = new AbortController();
        syncProfiles(queue);
      }
    }
  };

  // Get top growing profiles for slider
  const topGrowing = getTopGrowingProfiles(10);
  
  // Calculate growth for a profile
  const getGrowth = (profile: SyncedInstagramProfile) => {
    if (profile.growthHistory.length < 2) return 0;
    const first = profile.growthHistory[0].followers;
    const last = profile.growthHistory[profile.growthHistory.length - 1].followers;
    return last - first;
  };

  // Auto-slide for top growing
  useEffect(() => {
    if (topGrowing.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % topGrowing.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [topGrowing.length]);

  const connectedProfiles = syncData.profiles.filter(p => p.isConnectedToDashboard);
  const notConnectedProfiles = syncData.profiles.filter(p => !p.isConnectedToDashboard);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <Users className="w-8 h-8 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">{syncData.users.length}</p>
          <p className="text-xs text-muted-foreground">Usuários SquareCloud</p>
        </div>
        <div className="glass-card p-4 text-center">
          <Instagram className="w-8 h-8 mx-auto text-pink-500 mb-2" />
          <p className="text-2xl font-bold">{syncData.totalProfilesCount}</p>
          <p className="text-xs text-muted-foreground">Perfis Instagram Total</p>
        </div>
        <div className="glass-card p-4 text-center">
          <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
          <p className="text-2xl font-bold">{connectedProfiles.length}</p>
          <p className="text-xs text-muted-foreground">Conectados ao Dashboard</p>
        </div>
        <div className="glass-card p-4 text-center">
          <XCircle className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
          <p className="text-2xl font-bold">{notConnectedProfiles.length}</p>
          <p className="text-xs text-muted-foreground">Ainda não conectados</p>
        </div>
      </div>

      {/* Sync Controls */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Sincronização de Usuários</h3>
            <p className="text-sm text-muted-foreground">
              Última sincronização: {syncData.lastSyncDate 
                ? new Date(syncData.lastSyncDate).toLocaleString('pt-BR')
                : 'Nunca'}
            </p>
          </div>
          <div className="flex gap-2">
            {isSyncing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={togglePause}
                  className="cursor-pointer"
                >
                  {syncData.isPaused ? (
                    <><Play className="w-4 h-4 mr-2" /> Retomar</>
                  ) : (
                    <><Pause className="w-4 h-4 mr-2" /> Pausar</>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                onClick={startFullSync}
                className="cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Usuários
              </Button>
            )}
          </div>
        </div>

        {/* Sync Progress */}
        {isSyncing && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm">
                Sincronizando: <strong>@{syncData.currentlySyncing}</strong>
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {syncProgress.current}/{syncProgress.total}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-mro-cyan transition-all duration-500"
                style={{ width: `${(syncProgress.current / Math.max(1, syncProgress.total)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {syncData.syncQueue.length} perfis restantes na fila
            </p>
          </div>
        )}
      </div>

      {/* Top Growing Profiles Slider */}
      {topGrowing.length > 0 && (
        <div className="glass-card p-6 overflow-hidden">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Perfis com Maior Crescimento
          </h3>
          
          <div className="relative">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {topGrowing.map((profile, idx) => {
                const growth = getGrowth(profile);
                return (
                  <div 
                    key={profile.username}
                    className="min-w-full p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl"
                  >
                    <div className="flex items-center gap-6">
                      <img 
                        src={profile.profilePicUrl}
                        alt={profile.username}
                        className="w-20 h-20 rounded-full object-cover border-4 border-green-500"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`;
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-xl font-bold">@{profile.username}</p>
                        <p className="text-muted-foreground">{profile.fullName}</p>
                        <div className="flex gap-4 mt-2">
                          <span className="text-sm">{profile.followers.toLocaleString()} seguidores</span>
                          <span className="text-sm text-green-500 font-bold">
                            +{growth.toLocaleString()} crescimento
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold text-green-500">#{idx + 1}</p>
                        <p className="text-xs text-muted-foreground">ranking</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Slider Controls */}
            <div className="flex justify-center gap-2 mt-4">
              <button 
                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                className="p-2 rounded-full bg-secondary hover:bg-secondary/80 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {topGrowing.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentSlide ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
              <button 
                onClick={() => setCurrentSlide(prev => Math.min(topGrowing.length - 1, prev + 1))}
                className="p-2 rounded-full bg-secondary hover:bg-secondary/80 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Lists */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Not Connected Profiles */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Usuário ainda não se conectou
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {notConnectedProfiles.length} perfis
            </span>
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notConnectedProfiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Todos os perfis estão conectados!
              </p>
            ) : (
              notConnectedProfiles.map(profile => (
                <div 
                  key={profile.username}
                  className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg"
                >
                  <img 
                    src={profile.profilePicUrl}
                    alt={profile.username}
                    className="w-12 h-12 rounded-full object-cover border border-yellow-500/50"
                    onError={(e) => {
                      e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">@{profile.username}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {profile.ownerUserName}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-medium">{profile.followers.toLocaleString()}</p>
                    <p className="text-muted-foreground">seguidores</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Connected Profiles */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Conectados ao Dashboard
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {connectedProfiles.length} perfis
            </span>
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {connectedProfiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum perfil conectado ainda
              </p>
            ) : (
              connectedProfiles.map(profile => {
                const growth = getGrowth(profile);
                return (
                  <div 
                    key={profile.username}
                    className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-green-500/20"
                  >
                    <img 
                      src={profile.profilePicUrl}
                      alt={profile.username}
                      className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">@{profile.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Atualizado: {new Date(profile.lastUpdated).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-medium">{profile.followers.toLocaleString()}</p>
                      {growth > 0 && (
                        <p className="text-green-500 font-bold">+{growth.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* All Synced Profiles Grid */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          Todos os Perfis Sincronizados
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {syncData.profiles.length} perfis
          </span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[600px] overflow-y-auto">
          {syncData.profiles.map(profile => {
            const growth = getGrowth(profile);
            return (
              <div 
                key={profile.username}
                className={`p-4 rounded-xl text-center transition-all hover:scale-105 ${
                  profile.isConnectedToDashboard 
                    ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30' 
                    : 'bg-secondary/30 border border-border'
                }`}
              >
                <img 
                  src={profile.profilePicUrl}
                  alt={profile.username}
                  className={`w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 ${
                    profile.isConnectedToDashboard ? 'border-green-500' : 'border-muted'
                  }`}
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`;
                  }}
                />
                <p className="font-medium text-sm truncate">@{profile.username}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.followers.toLocaleString()} seg.
                </p>
                {growth > 0 && (
                  <p className="text-xs text-green-500 font-bold mt-1">
                    +{growth.toLocaleString()}
                  </p>
                )}
                {!profile.isConnectedToDashboard && (
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded">
                    Não conectado
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SyncDashboard;
