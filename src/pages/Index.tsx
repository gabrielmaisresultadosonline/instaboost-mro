import { useState, useEffect } from 'react';
import { ProfileSearch } from '@/components/ProfileSearch';
import { Dashboard } from '@/components/Dashboard';
import { MROSession } from '@/types/instagram';
import { getSession, saveSession, updateProfile, updateAnalysis, hasExistingSession, createEmptySession } from '@/lib/storage';
import { generateMockProfile, generateMockAnalysis } from '@/lib/mockData';
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
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock data (in production, this would call real APIs)
      const profile = generateMockProfile(username);
      const analysis = generateMockAnalysis(profile);

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
        title: "Análise concluída!",
        description: `Perfil @${profile.username} analisado com sucesso.`,
      });
    } catch (error) {
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
