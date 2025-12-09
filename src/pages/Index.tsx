import { useState, useEffect } from 'react';
import { LoginPage } from '@/components/LoginPage';
import { ProfileRegistration } from '@/components/ProfileRegistration';
import { Dashboard } from '@/components/Dashboard';
import { MROSession, ProfileSession, InstagramProfile, ProfileAnalysis } from '@/types/instagram';
import { 
  getSession, 
  saveSession, 
  hasExistingSession, 
  createEmptySession,
  addProfile,
  setActiveProfile,
  removeProfile,
  getActiveProfile
} from '@/lib/storage';
import { 
  isAuthenticated, 
  getRegisteredIGs,
  isIGRegistered,
  addRegisteredIG,
  getCurrentUser
} from '@/lib/userStorage';
import { fetchInstagramProfile, analyzeProfile } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { 
  loadPersistedDataOnLogin, 
  syncSessionToPersistent,
  hasPersistedProfileData,
  getPersistedProfile,
  persistProfileData,
  shouldFetchProfile,
  syncPersistentToSession
} from '@/lib/persistentStorage';

const Index = () => {
  const [session, setSession] = useState<MROSession>(createEmptySession());
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasRegisteredProfiles, setHasRegisteredProfiles] = useState(false);
  const { toast } = useToast();

  // Check auth status on mount and load persisted data
  useEffect(() => {
    const authenticated = isAuthenticated();
    setIsLoggedIn(authenticated);
    
    if (authenticated) {
      const registeredIGs = getRegisteredIGs();
      const igUsernames = registeredIGs.map(ig => ig.username);
      setHasRegisteredProfiles(registeredIGs.length > 0);
      
      // IMPORTANT: Load persisted data from permanent storage
      if (igUsernames.length > 0) {
        console.log('🔐 Carregando dados persistentes...');
        loadPersistedDataOnLogin(igUsernames);
        syncPersistentToSession();
      }
      
      // Get session (now with restored data)
      const existingSession = getSession();
      setSession(existingSession);
      
      // Show dashboard if we have profiles
      if (existingSession.profiles.length > 0) {
        setShowDashboard(true);
        console.log(`✅ ${existingSession.profiles.length} perfis carregados do armazenamento permanente`);
      }
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    const registeredIGs = getRegisteredIGs();
    const igUsernames = registeredIGs.map(ig => ig.username);
    setHasRegisteredProfiles(registeredIGs.length > 0);
    
    // IMPORTANT: Load persisted data on login - NO need to re-fetch
    if (igUsernames.length > 0) {
      console.log('🔐 Restaurando dados do armazenamento permanente...');
      loadPersistedDataOnLogin(igUsernames);
      syncPersistentToSession();
    }
    
    const existingSession = getSession();
    setSession(existingSession);
    
    if (existingSession.profiles.length > 0) {
      setShowDashboard(true);
      console.log(`✅ Login: ${existingSession.profiles.length} perfis restaurados`);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowDashboard(false);
    setHasRegisteredProfiles(false);
  };

  const handleProfileRegistered = (profile: InstagramProfile, analysis: ProfileAnalysis) => {
    // Add profile to session
    addProfile(profile, analysis);
    
    // PERSIST DATA PERMANENTLY
    persistProfileData(profile.username, profile, analysis);
    
    // Get updated session
    const updatedSession = getSession();
    setSession(updatedSession);
    setShowDashboard(true);
    setHasRegisteredProfiles(true);

    // Sync to persistent storage
    syncSessionToPersistent();

    toast({
      title: "Perfil cadastrado! ✨",
      description: `@${profile.username} está pronto para usar.`,
    });
  };

  const handleSyncComplete = async (instagrams: string[]) => {
    setIsLoading(true);
    const user = getCurrentUser();
    let loadedCount = 0;
    let cachedCount = 0;
    
    for (const ig of instagrams) {
      const normalizedIg = ig.toLowerCase();
      
      // Check if already in session
      const existingProfile = session.profiles.find(
        p => p.profile.username.toLowerCase() === normalizedIg
      );
      
      if (existingProfile) {
        console.log(`⏭️ @${ig} já está na sessão`);
        continue;
      }
      
      // CHECK PERSISTENT STORAGE FIRST - avoid unnecessary API calls
      const { shouldFetch, reason } = shouldFetchProfile(normalizedIg);
      const persistedData = getPersistedProfile(normalizedIg);
      
      if (persistedData && !shouldFetch) {
        // USE CACHED DATA - no API call needed
        console.log(`📦 Usando dados em cache para @${ig}: ${reason}`);
        addProfile(persistedData.profile, persistedData.analysis);
        cachedCount++;
        
        toast({
          title: `@${ig} carregado`,
          description: reason
        });
        continue;
      }
      
      // Only fetch from API if needed
      try {
        toast({
          title: `Buscando @${ig}...`,
          description: shouldFetch ? reason : 'Buscando dados atualizados'
        });
        
        const profileResult = await fetchInstagramProfile(ig);
        
        if (profileResult.success && profileResult.profile) {
          const analysisResult = await analyzeProfile(profileResult.profile);
          
          if (analysisResult.success && analysisResult.analysis) {
            addProfile(profileResult.profile, analysisResult.analysis);
            
            // PERSIST DATA PERMANENTLY
            persistProfileData(ig, profileResult.profile, analysisResult.analysis);
            loadedCount++;
            
            // Mark as registered if not already
            if (user?.email && !isIGRegistered(ig)) {
              addRegisteredIG(ig, user.email, true);
            }
          }
        }
      } catch (error) {
        console.error(`Error loading ${ig}:`, error);
        
        // Try to use cached data as fallback
        if (persistedData) {
          console.log(`⚠️ Erro na API, usando cache para @${ig}`);
          addProfile(persistedData.profile, persistedData.analysis);
          cachedCount++;
        }
      }
    }

    const updatedSession = getSession();
    setSession(updatedSession);
    
    // Sync all to persistent storage
    syncSessionToPersistent();
    
    if (updatedSession.profiles.length > 0) {
      setShowDashboard(true);
      setHasRegisteredProfiles(true);
    }
    
    setIsLoading(false);
    
    toast({
      title: 'Sincronização concluída!',
      description: `${loadedCount} buscado(s) da API, ${cachedCount} do cache`
    });
  };

  const handleSearch = async (username: string) => {
    // Check if IG is registered
    if (!isIGRegistered(username)) {
      toast({
        title: 'Perfil não cadastrado',
        description: 'Cadastre este perfil primeiro antes de analisar',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      toast({
        title: "Buscando perfil...",
        description: `Analisando @${username.replace('@', '')}`,
      });

      const profileResult = await fetchInstagramProfile(username);

      if (!profileResult.success || !profileResult.profile) {
        toast({
          title: "Erro ao buscar perfil",
          description: profileResult.error || "Tente novamente",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const profile = profileResult.profile;

      toast({
        title: "Analisando com IA...",
        description: "Gerando insights personalizados",
      });

      const analysisResult = await analyzeProfile(profile);

      if (!analysisResult.success || !analysisResult.analysis) {
        toast({
          title: "Erro na análise",
          description: analysisResult.error || "Usando análise básica",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      addProfile(profile, analysisResult.analysis);
      
      const updatedSession = getSession();
      setSession(updatedSession);
      setShowDashboard(true);

      toast({
        title: "Análise concluída! ✨",
        description: `Perfil @${profile.username} analisado com sucesso.`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar o perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewProfile = async (username: string) => {
    await handleSearch(username);
  };

  const handleSelectProfile = (profileId: string) => {
    setActiveProfile(profileId);
    const updatedSession = getSession();
    setSession(updatedSession);
  };

  const handleRemoveProfile = (profileId: string) => {
    removeProfile(profileId);
    const updatedSession = getSession();
    setSession(updatedSession);
    
    if (updatedSession.profiles.length === 0) {
      setShowDashboard(false);
    }
  };

  const handleSessionUpdate = (updatedSession: MROSession) => {
    setSession(updatedSession);
    saveSession(updatedSession);
    
    // Sync to persistent storage on every update
    syncSessionToPersistent();
  };

  const handleReset = () => {
    setSession(createEmptySession());
    setShowDashboard(false);
    toast({
      title: "Sessão resetada",
      description: "Todas as informações foram apagadas.",
    });
  };

  const handleNavigateToRegister = () => {
    setShowDashboard(false);
  };

  // Not logged in - show login page
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Logged in but no registered profiles - show registration
  if (!hasRegisteredProfiles || !showDashboard) {
    return (
      <ProfileRegistration 
        onProfileRegistered={handleProfileRegistered}
        onSyncComplete={handleSyncComplete}
      />
    );
  }

  // Show dashboard
  if (showDashboard && session.profiles.length > 0) {
    return (
      <Dashboard 
        session={session} 
        onSessionUpdate={handleSessionUpdate}
        onReset={handleReset}
        onAddProfile={handleAddNewProfile}
        onSelectProfile={handleSelectProfile}
        onRemoveProfile={handleRemoveProfile}
        onNavigateToRegister={handleNavigateToRegister}
        isLoading={isLoading}
        onLogout={handleLogout}
      />
    );
  }

  // Fallback to registration
  return (
    <ProfileRegistration 
      onProfileRegistered={handleProfileRegistered}
      onSyncComplete={handleSyncComplete}
    />
  );
};

export default Index;
