import { useState, useEffect } from 'react';
import { ProfileSearch } from '@/components/ProfileSearch';
import { Dashboard } from '@/components/Dashboard';
import { MROSession, InstagramProfile, ProfileAnalysis } from '@/types/instagram';
import { getSession, saveSession, updateProfile, updateAnalysis, hasExistingSession, createEmptySession } from '@/lib/storage';
import { fetchInstagramProfile, analyzeProfile } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [session, setSession] = useState<MROSession>(createEmptySession());
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const { toast } = useToast();

  // Load existing session on mount
  useEffect(() => {
    if (hasExistingSession()) {
      const existingSession = getSession();
      setSession(existingSession);
      setShowDashboard(true);
    }
  }, []);

  const handleSearch = async (username: string) => {
    setIsLoading(true);

    try {
      // Fetch Instagram profile
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

      if (profileResult.simulated) {
        toast({
          title: "Perfil encontrado",
          description: profileResult.message || "Dados complementados via simulação",
        });
      }

      // Analyze profile with AI
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

      const analysis = analysisResult.analysis;

      // Save to storage
      updateProfile(profile);
      updateAnalysis(analysis);

      // Update state
      const newSession: MROSession = {
        profile,
        analysis,
        strategies: [],
        creatives: [],
        creativesRemaining: 6,
        lastUpdated: new Date().toISOString(),
      };
      
      saveSession(newSession);
      setSession(newSession);
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

  if (showDashboard && session.profile) {
    return (
      <Dashboard 
        session={session} 
        onSessionUpdate={handleSessionUpdate}
        onReset={handleReset}
      />
    );
  }

  return <ProfileSearch onSearch={handleSearch} isLoading={isLoading} />;
};

export default Index;
