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

const Index = () => {
  const [session, setSession] = useState<MROSession>(createEmptySession());
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasRegisteredProfiles, setHasRegisteredProfiles] = useState(false);
  const { toast } = useToast();

  // Check auth status on mount
  useEffect(() => {
    const authenticated = isAuthenticated();
    setIsLoggedIn(authenticated);
    
    if (authenticated) {
      const registeredIGs = getRegisteredIGs();
      setHasRegisteredProfiles(registeredIGs.length > 0);
      
      if (hasExistingSession()) {
        const existingSession = getSession();
        setSession(existingSession);
        // Only show dashboard if we have profiles in session
        if (existingSession.profiles.length > 0) {
          setShowDashboard(true);
        }
      }
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    const registeredIGs = getRegisteredIGs();
    setHasRegisteredProfiles(registeredIGs.length > 0);
    
    if (hasExistingSession()) {
      const existingSession = getSession();
      setSession(existingSession);
      if (existingSession.profiles.length > 0) {
        setShowDashboard(true);
      }
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
    
    // Get updated session
    const updatedSession = getSession();
    setSession(updatedSession);
    setShowDashboard(true);
    setHasRegisteredProfiles(true);

    toast({
      title: "Perfil cadastrado! ✨",
      description: `@${profile.username} está pronto para usar.`,
    });
  };

  const handleSyncComplete = async (instagrams: string[]) => {
    setIsLoading(true);
    const user = getCurrentUser();
    
    for (const ig of instagrams) {
      // Check if already in session
      const existingProfile = session.profiles.find(
        p => p.profile.username.toLowerCase() === ig.toLowerCase()
      );
      
      if (!existingProfile) {
        try {
          toast({
            title: `Carregando @${ig}...`,
            description: 'Buscando dados do perfil'
          });
          
          const profileResult = await fetchInstagramProfile(ig);
          
          if (profileResult.success && profileResult.profile) {
            const analysisResult = await analyzeProfile(profileResult.profile);
            
            if (analysisResult.success && analysisResult.analysis) {
              addProfile(profileResult.profile, analysisResult.analysis);
              
              // Mark as registered if not already
              if (user?.email && !isIGRegistered(ig)) {
                addRegisteredIG(ig, user.email, true);
              }
            }
          }
        } catch (error) {
          console.error(`Error loading ${ig}:`, error);
        }
      }
    }

    const updatedSession = getSession();
    setSession(updatedSession);
    
    if (updatedSession.profiles.length > 0) {
      setShowDashboard(true);
      setHasRegisteredProfiles(true);
    }
    
    setIsLoading(false);
    
    toast({
      title: 'Sincronização concluída!',
      description: `${instagrams.length} perfil(is) carregado(s)`
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
  };

  const handleReset = () => {
    setSession(createEmptySession());
    setShowDashboard(false);
    toast({
      title: "Sessão resetada",
      description: "Todas as informações foram apagadas.",
    });
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
