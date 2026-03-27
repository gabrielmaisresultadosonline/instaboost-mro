import { useState, useEffect } from 'react';
import { LoginPage } from '@/components/LoginPage';
import { ProfileRegistration } from '@/components/ProfileRegistration';
import { Dashboard } from '@/components/Dashboard';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { AgeRestrictionDialog } from '@/components/AgeRestrictionDialog';
import { PrivateProfileDialog } from '@/components/PrivateProfileDialog';
import AnnouncementPopup from '@/components/AnnouncementPopup';
import { CadastrarContaButton } from '@/components/CadastrarContaButton';
import { MROSession, ProfileSession, InstagramProfile, ProfileAnalysis } from '@/types/instagram';
import {
  getSession, 
  saveSession, 
  hasExistingSession, 
  createEmptySession,
  addProfile,
  setActiveProfile,
  removeProfile,
  getActiveProfile,
  cleanExpiredCreatives,
  cleanExpiredStrategies,
  setCloudSyncCallback
} from '@/lib/storage';
import { 
  isAuthenticated, 
  getRegisteredIGs,
  isIGRegistered,
  addRegisteredIG,
  getCurrentUser,
  logoutUser,
  saveUserToCloud
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
import { supabase } from '@/integrations/supabase/client';

// Helper function to check for cached profiles in admin storage
const checkManuallyScrapedProfile = async (username: string): Promise<any | null> => {
  try {
    const normalizedUsername = username.toLowerCase().replace('@', '').trim();

    const { data, error } = await supabase.functions.invoke('admin-data-storage', {
      body: { action: 'load' }
    });

    if (error || !data?.exists || !data?.data?.profiles) {
      return null;
    }

    const normalize = (value: string | undefined | null) =>
      (value || '').toLowerCase().replace('@', '').trim();

    const cachedProfile = data.data.profiles.find(
      (p: any) => normalize(p.username) === normalizedUsername
    );

    if (!cachedProfile) {
      return null;
    }

    const hasUsefulCachedData =
      (Number(cachedProfile.followers) || 0) > 0 ||
      (Number(cachedProfile.postsCount) || (typeof cachedProfile.posts === 'number' ? cachedProfile.posts : 0)) > 0 ||
      (cachedProfile.bio && String(cachedProfile.bio).trim().length > 0) ||
      (cachedProfile.profilePicture && String(cachedProfile.profilePicture).length > 10) ||
      (cachedProfile.profilePicUrl && String(cachedProfile.profilePicUrl).length > 10) ||
      (Array.isArray(cachedProfile.recentPosts) && cachedProfile.recentPosts.length > 0) ||
      (Array.isArray(cachedProfile.posts) && cachedProfile.posts.length > 0);

    if (hasUsefulCachedData) {
      console.log(`🔧 Encontrado perfil em cache admin para @${normalizedUsername}`);
      return cachedProfile;
    }

    return null;
  } catch (error) {
    console.error('Erro ao verificar cache de perfil no admin:', error);
    return null;
  }
};

const Index = () => {
  const [session, setSession] = useState<MROSession>(createEmptySession());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSubMessage, setLoadingSubMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | undefined>(undefined);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasRegisteredProfiles, setHasRegisteredProfiles] = useState(false);
  const [ageRestrictionProfile, setAgeRestrictionProfile] = useState<string | null>(null);
  const [privateProfile, setPrivateProfile] = useState<string | null>(null);
  const [pendingSyncInstagrams, setPendingSyncInstagrams] = useState<string[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const { toast } = useToast();

  // Get current logged in username
  const getLoggedInUsername = (): string => {
    const user = getCurrentUser();
    return user?.username || 'anonymous';
  };

  // Set up cloud sync callback on mount (critical for strategies/creatives persistence)
  useEffect(() => {
    setCloudSyncCallback(saveUserToCloud);
  }, []);

  // Check auth status on mount and load persisted data
  useEffect(() => {
    const initializeFromCloudData = async () => {
      try {
        const authenticated = isAuthenticated();
        setIsLoggedIn(authenticated);
        
        if (authenticated) {
          const registeredIGs = getRegisteredIGs();
          setHasRegisteredProfiles(registeredIGs.length > 0);
          
          // Just check the existing session - data should already be loaded
          const existingSession = getSession();
          
          console.log(`🔐 Auth check: ${registeredIGs.length} IGs registrados, ${existingSession.profiles.length} perfis na sessão`);
          
          // Clean expired data
          cleanExpiredCreatives();
          cleanExpiredStrategies();
          
          setSession(existingSession);
          
          if (existingSession.profiles.length > 0) {
            setShowDashboard(true);
            // Show announcements when user is already logged in and has profiles
            setShowAnnouncements(true);
          }
        }
      } catch (error) {
        console.error('[Index] Error in auth check:', error);
        setIsLoggedIn(false);
      }
    };
    
    initializeFromCloudData();
  }, []);

  const handleLoginSuccess = async () => {
    setIsLoggedIn(true);
    
    try {
      const registeredIGs = getRegisteredIGs();
      setHasRegisteredProfiles(registeredIGs.length > 0);
      
      // IMPORTANT: LoginPage already called initializeFromCloud if data exists
      // Just check the current session state (already initialized from cloud)
      const existingSession = getSession();
      
      console.log(`🔐 Login completo: ${existingSession.profiles.length} perfis na sessão, ${registeredIGs.length} IGs registrados`);
      
      if (existingSession.profiles.length > 0) {
        // Data already loaded from cloud by LoginPage - just show dashboard
        setSession(existingSession);
        setShowDashboard(true);
        console.log(`☁️ Perfis já carregados da nuvem - mostrando dashboard direto`);
      } else if (registeredIGs.length > 0) {
        // No cloud data but has registered profiles - AUTO SYNC needed
        const igUsernames = registeredIGs.map(ig => ig.username);
        console.log(`🔄 Nenhum dado na nuvem, sincronizando ${igUsernames.length} perfis...`);
        setIsLoading(true);
        setLoadingMessage('Sincronizando perfis...');
        setLoadingSubMessage(`Carregando ${igUsernames.length} perfis. Isso pode levar alguns minutos.`);
        
        // Trigger auto-sync
        await handleSyncComplete(igUsernames);
      } else {
        // No profiles at all - show registration screen
        setSession(existingSession);
      }
    } catch (error) {
      console.error('[Index] Error in handleLoginSuccess:', error);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setIsLoggedIn(false);
    setShowDashboard(false);
    setHasRegisteredProfiles(false);
    setSession(createEmptySession());
  };

  const handleProfileRegistered = async (profile: InstagramProfile, analysis: ProfileAnalysis) => {
    const loggedInUsername = getLoggedInUsername();
    
    // Add profile to session
    addProfile(profile, analysis);
    
    // PERSIST DATA PERMANENTLY TO SERVER
    await persistProfileData(loggedInUsername, profile.username, profile, analysis);
    
    // Get updated session
    const updatedSession = getSession();
    setSession(updatedSession);
    setShowDashboard(true);
    setHasRegisteredProfiles(true);

    // Sync to server
    await syncSessionToPersistent(loggedInUsername);

    toast({
      title: "Perfil cadastrado! ✨",
      description: `@${profile.username} está pronto para usar.`,
    });
  };

  const handleSyncComplete = async (instagrams: string[]) => {
    setIsLoading(true);
    setLoadingMessage('Sincronizando perfis...');
    setLoadingSubMessage(`Total: ${instagrams.length} conta${instagrams.length !== 1 ? 's' : ''} para sincronizar`);
    setSyncProgress({ current: 0, total: instagrams.length });
    
    const user = getCurrentUser();
    const loggedInUsername = getLoggedInUsername();
    let loadedCount = 0;
    let cachedCount = 0;
    let processedCount = 0;
    
    for (const ig of instagrams) {
      processedCount++;
      setSyncProgress({ current: processedCount, total: instagrams.length });
      setLoadingMessage(`Sincronizando @${ig}...`);
      setLoadingSubMessage(`${processedCount} de ${instagrams.length} conta${instagrams.length !== 1 ? 's' : ''}`);
      
      const normalizedIg = ig.toLowerCase();
      
      // Check if already in session
      const existingProfile = session.profiles.find(
        p => p.profile.username.toLowerCase() === normalizedIg
      );
      
      if (existingProfile) {
        console.log(`⏭️ @${ig} já está na sessão`);
        continue;
      }
      
      // CHECK SERVER STORAGE FIRST - avoid unnecessary API calls (30 day cache)
      const { shouldFetch, reason } = shouldFetchProfile(normalizedIg);
      const persistedData = getPersistedProfile(normalizedIg);
      
      // CRITICAL: Only use cached data if it has REAL data (not zeros from failed sync)
      const hasRealCachedData = persistedData && (
        persistedData.profile.followers > 0 || 
        persistedData.profile.posts > 0 || 
        (persistedData.profile.recentPosts && persistedData.profile.recentPosts.length > 0) ||
        (persistedData.profile.bio && persistedData.profile.bio.trim().length > 0) ||
        (persistedData.profile.profilePicUrl && 
         !persistedData.profile.profilePicUrl.includes('dicebear') &&
         !persistedData.profile.profilePicUrl.includes('ui-avatars.com') &&
         persistedData.profile.profilePicUrl.length > 50)
      );
      
      if (hasRealCachedData && !shouldFetch) {
        // USE CACHED DATA - no API call needed (within 30 days)
        console.log(`📦 Usando dados do cache (30 dias) para @${ig}: ${reason}`);
        addProfile(persistedData.profile, persistedData.analysis);
        cachedCount++;
        
        toast({
          title: `@${ig} carregado do cache`,
          description: reason
        });
        continue;
      } else if (persistedData && !hasRealCachedData) {
        // Cache has zero/invalid data - force API fetch
        console.warn(`⚠️ Cache de @${ig} tem dados zerados - forçando busca na API`);
      }
      
      // Only fetch from API if needed (cache expired or no cache)
      try {
        toast({
          title: `Buscando @${ig}...`,
          description: shouldFetch ? reason : 'Buscando dados atualizados'
        });
        
        const profileResult = await fetchInstagramProfile(ig);
        
        if (profileResult.success && profileResult.profile) {
          // Check if profile is private
          if (profileResult.isPrivate) {
            console.log(`🔒 @${ig} é um perfil privado - salvando dados parciais`);
            setLoadingMessage(`@${ig} é privado - salvando dados básicos...`);
            
            // Still analyze and save private profiles with basic data
            const analysisResult = await analyzeProfile(profileResult.profile);
            
            if (analysisResult.success && analysisResult.analysis) {
              addProfile(profileResult.profile, analysisResult.analysis);
              await persistProfileData(loggedInUsername, ig, profileResult.profile, analysisResult.analysis);
              loadedCount++;
              
              if (user?.email && !isIGRegistered(ig)) {
                addRegisteredIG(ig, user.email, true);
              }
            }
            
            // Show private profile dialog with tutorial
            setPrivateProfile(ig);
            setPendingSyncInstagrams(instagrams);
          } else {
            setLoadingMessage(`Analisando @${ig} com I.A...`);
            const analysisResult = await analyzeProfile(profileResult.profile);
            
            if (analysisResult.success && analysisResult.analysis) {
              addProfile(profileResult.profile, analysisResult.analysis);
              
              // PERSIST DATA PERMANENTLY TO SERVER (cached for 30 days)
              await persistProfileData(loggedInUsername, ig, profileResult.profile, analysisResult.analysis);
              loadedCount++;
              
              // Mark as registered if not already
              if (user?.email && !isIGRegistered(ig)) {
                addRegisteredIG(ig, user.email, true);
              }
            } else {
              console.warn(`⚠️ Análise falhou para @${ig}`);
              // Still count as loaded if profile was fetched
              if (persistedData) {
                addProfile(persistedData.profile, persistedData.analysis);
                cachedCount++;
              }
            }
          }
        } else {
          // API failed - check error type
          console.warn(`⚠️ API retornou erro para @${ig}: ${profileResult.error}`);
          
          // Only use cached data if it has REAL data (followers > 0 OR posts > 0 OR recentPosts OR bio)
          const hasRealCachedData = persistedData && (
            persistedData.profile.followers > 0 || 
            persistedData.profile.posts > 0 || 
            (persistedData.profile.recentPosts && persistedData.profile.recentPosts.length > 0) ||
            (persistedData.profile.bio && persistedData.profile.bio.trim().length > 0) ||
            (persistedData.profile.profilePicUrl && 
             !persistedData.profile.profilePicUrl.includes('ui-avatars.com') &&
             persistedData.profile.profilePicUrl.length > 50)
          );
          
          if (hasRealCachedData) {
            console.log(`📦 Usando cache com dados reais para @${ig}`);
            addProfile(persistedData.profile, persistedData.analysis);
            cachedCount++;
          } else {
            // CHECK FOR MANUALLY SCRAPED PROFILE BEFORE SHOWING RESTRICTION DIALOG
            const manualProfile = await checkManuallyScrapedProfile(ig);
            
            if (manualProfile) {
              console.log(`🔧 Usando dados do scraper manual para @${ig}`);
              setLoadingMessage(`Usando dados manuais para @${ig}...`);
              
              // Convert cached profile to InstagramProfile format
              const postsSource = Array.isArray(manualProfile.recentPosts)
                ? manualProfile.recentPosts
                : Array.isArray(manualProfile.posts)
                  ? manualProfile.posts
                  : [];

              const manualPostsCount = Number(manualProfile.postsCount) ||
                (typeof manualProfile.posts === 'number' ? manualProfile.posts : postsSource.length);

              const manualInstagramProfile: InstagramProfile = {
                username: manualProfile.username,
                fullName: manualProfile.fullName || manualProfile.username,
                bio: manualProfile.bio || '',
                profilePicUrl: manualProfile.profilePicture || manualProfile.profilePicUrl || `https://ui-avatars.com/api/?name=${manualProfile.username}&background=E1306C&color=fff`,
                followers: Number(manualProfile.followers) || 0,
                following: Number(manualProfile.following) || 0,
                posts: manualPostsCount,
                externalUrl: Array.isArray(manualProfile.externalUrl)
                  ? manualProfile.externalUrl[0] || ''
                  : (manualProfile.externalUrl || ''),
                isBusinessAccount: false,
                category: '',
                engagement: Number(manualProfile.engagementRate) || Number(manualProfile.engagement) || 0,
                avgLikes: Number(manualProfile.avgLikes) || 0,
                avgComments: Number(manualProfile.avgComments) || 0,
                recentPosts: postsSource.map((p: any, idx: number) => ({
                  id: p.id || `manual-${idx}`,
                  imageUrl: p.imageUrl || p.postUrl || p.thumbnail || p.displayUrl || '',
                  postUrl: p.postUrl || '',
                  caption: p.caption || '',
                  likes: Number(p.likes) || 0,
                  comments: Number(p.comments) || 0,
                  timestamp: p.timestamp || new Date().toISOString(),
                  hasHumanFace: false
                }))
              };
              
              // Analyze with AI
              const analysisResult = await analyzeProfile(manualInstagramProfile);
              
              if (analysisResult.success && analysisResult.analysis) {
                addProfile(manualInstagramProfile, analysisResult.analysis);
                await persistProfileData(loggedInUsername, ig, manualInstagramProfile, analysisResult.analysis);
                loadedCount++;
                
                toast({
                  title: `@${ig} carregado via scraper manual!`,
                  description: 'Dados salvos pelo administrador'
                });
              } else {
                // Use manual profile without analysis
                const defaultAnalysis: ProfileAnalysis = {
                  strengths: ['Perfil carregado via scraper manual'],
                  weaknesses: ['Análise automática indisponível'],
                  opportunities: ['Dados disponíveis para estratégias'],
                  niche: 'Não identificado',
                  audienceType: 'Não identificado',
                  contentScore: 0,
                  engagementScore: 0,
                  profileScore: 0,
                  recommendations: ['Gere estratégias para análise completa']
                };
                addProfile(manualInstagramProfile, defaultAnalysis);
                await persistProfileData(loggedInUsername, ig, manualInstagramProfile, defaultAnalysis);
                loadedCount++;
              }
            } else {
              // Don't add profiles with zero data when API fails
              console.warn(`❌ @${ig} não existe ou não tem dados reais - não adicionando`);
              
              // Check if it's a restriction issue
              if (profileResult.isRestricted) {
                setAgeRestrictionProfile(ig);
              } else if (profileResult.isPrivate) {
                setPrivateProfile(ig);
              } else {
                // Generic restriction error
                setAgeRestrictionProfile(ig);
              }
              setPendingSyncInstagrams(instagrams);
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
    
    // Sync all to server
    await syncSessionToPersistent(loggedInUsername);
    
    if (updatedSession.profiles.length > 0) {
      setShowDashboard(true);
      setHasRegisteredProfiles(true);
    }
    
    setIsLoading(false);
    setSyncProgress(undefined);
    
    toast({
      title: 'Sincronização concluída!',
      description: `${loadedCount} da API, ${cachedCount} do cache (30 dias)`
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
    setLoadingMessage(`Buscando @${username.replace('@', '')}...`);
    setLoadingSubMessage('Analisando perfil com I.A. Isso pode levar até 5 minutos.');

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

  const handleSessionUpdate = async (updatedSession: MROSession) => {
    setSession(updatedSession);
    saveSession(updatedSession);
    
    // Sync to server on every update
    const loggedInUsername = getLoggedInUsername();
    await syncSessionToPersistent(loggedInUsername);
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

  // Navega para área de membros SEM sincronizar automaticamente
  const handleEnterMemberArea = () => {
    const updatedSession = getSession();
    setSession(updatedSession);
    
    if (updatedSession.profiles.length > 0) {
      setShowDashboard(true);
      setHasRegisteredProfiles(true);
    } else {
      // Se não tem perfis na sessão, apenas mostra o dashboard vazio
      setShowDashboard(true);
      setHasRegisteredProfiles(true);
    }
  };

  const handleRetrySync = () => {
    setAgeRestrictionProfile(null);
    setPrivateProfile(null);
    if (pendingSyncInstagrams.length > 0) {
      handleSyncComplete(pendingSyncInstagrams);
    }
  };

  // Handler para ir direto para área de membros com perfil placeholder (restrição de idade)
  const handleGoToMemberAreaWithPlaceholder = () => {
    if (!ageRestrictionProfile) return;
    
    const loggedInUsername = getLoggedInUsername();
    const username = ageRestrictionProfile.toLowerCase().replace('@', '');
    
    // Criar perfil placeholder para upload de screenshot
    const placeholderProfile: InstagramProfile = {
      username: username,
      fullName: username,
      bio: '',
      profilePicUrl: `https://ui-avatars.com/api/?name=${username}&background=E1306C&color=fff&size=200`,
      followers: 0,
      following: 0,
      posts: 0,
      externalUrl: '',
      isBusinessAccount: false,
      category: '',
      engagement: 0,
      avgLikes: 0,
      avgComments: 0,
      recentPosts: [],
      needsScreenshotAnalysis: true // Marcador especial para indicar que precisa de análise via screenshot
    };
    
    const placeholderAnalysis: ProfileAnalysis = {
      strengths: ['📸 Envie um print do perfil para análise completa'],
      weaknesses: ['⚠️ Dados não disponíveis via API (restrição de idade)'],
      opportunities: ['🎯 Após enviar o print, nossa IA vai analisar seu perfil'],
      niche: 'A ser identificado',
      audienceType: 'A ser identificado',
      contentScore: 0,
      engagementScore: 0,
      profileScore: 0,
      recommendations: ['Envie um print do seu perfil do Instagram para análise completa']
    };
    
    // Adiciona o perfil placeholder
    addProfile(placeholderProfile, placeholderAnalysis);
    
    // Registra o IG se tiver email
    const user = getCurrentUser();
    if (user?.email && !isIGRegistered(username)) {
      addRegisteredIG(username, user.email, true);
    }
    
    const updatedSession = getSession();
    setSession(updatedSession);
    setShowDashboard(true);
    setHasRegisteredProfiles(true);
    setAgeRestrictionProfile(null);
    
    toast({
      title: "Perfil adicionado! 📸",
      description: `@${username} foi adicionado. Envie um print do perfil para análise completa.`,
    });
  };

  const ageRestrictionDialogElement = (
    <AgeRestrictionDialog
      isOpen={!!ageRestrictionProfile}
      onClose={() => setAgeRestrictionProfile(null)}
      username={ageRestrictionProfile || ''}
      onRetrySync={handleRetrySync}
      onGoToMemberArea={handleGoToMemberAreaWithPlaceholder}
    />
  );

  const privateProfileDialogElement = (
    <PrivateProfileDialog
      isOpen={!!privateProfile}
      onClose={() => setPrivateProfile(null)}
      username={privateProfile || ''}
      onRetrySync={handleRetrySync}
    />
  );

  // Not logged in - show login page
  if (!isLoggedIn) {
    return (
      <>
        <LoadingOverlay isVisible={isLoading} message={loadingMessage} subMessage={loadingSubMessage} />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        {ageRestrictionDialogElement}
        {privateProfileDialogElement}
      </>
    );
  }

  // Logged in but no registered profiles - show registration
  if (!hasRegisteredProfiles || !showDashboard) {
    return (
      <>
        <LoadingOverlay isVisible={isLoading} message={loadingMessage} subMessage={loadingSubMessage} progress={syncProgress} />
        <ProfileRegistration 
          onProfileRegistered={handleProfileRegistered}
          onSyncComplete={handleSyncComplete}
          onEnterMemberArea={handleEnterMemberArea}
          onLogout={handleLogout}
        />
        {ageRestrictionDialogElement}
        {privateProfileDialogElement}
      </>
    );
  }

  // Show dashboard
  // Get active profile to check if screenshot exists
  const activeProfile = session.profiles.find(p => p.id === session.activeProfileId);
  const hasScreenshot = !!activeProfile?.screenshotUrl;

  if (showDashboard && session.profiles.length > 0) {
    return (
      <>
        <LoadingOverlay isVisible={isLoading} message={loadingMessage} subMessage={loadingSubMessage} progress={syncProgress} />
        {/* Avisos só aparecem APÓS o upload do print do perfil */}
        {showAnnouncements && hasScreenshot && (
          <AnnouncementPopup targetArea="instagram" onComplete={() => setShowAnnouncements(false)} />
        )}
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
        {ageRestrictionDialogElement}
        {privateProfileDialogElement}
      </>
    );
  }

  // Fallback to registration
  return (
    <>
      <LoadingOverlay isVisible={isLoading} message={loadingMessage} subMessage={loadingSubMessage} progress={syncProgress} />
      <ProfileRegistration 
        onProfileRegistered={handleProfileRegistered}
        onSyncComplete={handleSyncComplete}
        onEnterMemberArea={handleEnterMemberArea}
        onLogout={handleLogout}
      />
      {ageRestrictionDialogElement}
      {privateProfileDialogElement}
    </>
  );
};

export default Index;
