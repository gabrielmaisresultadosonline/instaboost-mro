import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MROSession, Strategy, ProfileSession } from '@/types/instagram';
import { ProfileCard } from './ProfileCard';
import { AnalysisCard } from './AnalysisCard';
import { StrategyGenerator } from './StrategyGenerator';
import { StrategyDisplay } from './StrategyDisplay';
import { CaptionGenerator } from './CaptionGenerator';
import { GrowthTracker } from './GrowthTracker';
import { ProfileSelector } from './ProfileSelector';
import { UserHeader } from './UserHeader';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { TutorialButton } from '@/components/TutorialButton';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { TutorialList } from '@/components/TutorialList';
import { useTutorial, dashboardTutorial, strategyTutorial } from '@/hooks/useTutorial';
import { addStrategy, resetSession, getSession } from '@/lib/storage';
import { syncSessionToPersistent } from '@/lib/persistentStorage';
import { getCurrentUser } from '@/lib/userStorage';
import { 
  RotateCcw, 
  User, 
  BarChart3, 
  Lightbulb, 
  Type,
  TrendingUp,
  Wrench,
} from 'lucide-react';

interface DashboardProps {
  session: MROSession;
  onSessionUpdate: (session: MROSession) => void;
  onReset: () => void;
  onAddProfile: (username: string) => void;
  onSelectProfile: (profileId: string) => void;
  onRemoveProfile: (profileId: string) => void;
  onNavigateToRegister: () => void;
  isLoading?: boolean;
  onLogout?: () => void;
}

type Tab = 'profile' | 'analysis' | 'strategies' | 'legendas' | 'growth';

export const Dashboard = ({ 
  session, 
  onSessionUpdate, 
  onReset,
  onAddProfile,
  onSelectProfile,
  onRemoveProfile,
  onNavigateToRegister,
  isLoading,
  onLogout
}: DashboardProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Tutorial system
  const tutorial = useTutorial();

  // Get active profile
  const activeProfile = session.profiles.find(p => p.id === session.activeProfileId);

  const getLoggedInUsername = () => getCurrentUser()?.username || 'anonymous';

  const refreshSession = () => {
    const updatedSession = getSession();
    onSessionUpdate(updatedSession);
    // Sync to server
    syncSessionToPersistent(getLoggedInUsername());
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: <User className="w-4 h-4" /> },
    { id: 'analysis', label: 'Análise', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'strategies', label: 'Estratégias', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'legendas', label: 'Gerar Legendas', icon: <Type className="w-4 h-4" /> },
    { id: 'growth', label: 'Crescimento', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const handleStrategyGenerated = (strategy: Strategy) => {
    addStrategy(strategy);
    refreshSession();
    // Sync immediately after strategy generation
    syncSessionToPersistent(getLoggedInUsername());
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja resetar todas as informações? Esta ação não pode ser desfeita.')) {
      resetSession();
      onReset();
    }
  };

  if (!activeProfile) {
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
              {/* Botão Ferramenta MRO */}
              <Button
                onClick={() => navigate('/mro-ferramenta')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-lg shadow-yellow-500/30 animate-pulse-slow"
                data-tutorial="mro-button"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Ferramenta MRO
              </Button>
              <div className="hidden md:block" data-tutorial="profile-selector">
                <ProfileSelector
                  profiles={session.profiles}
                  activeProfileId={session.activeProfileId}
                  onSelectProfile={onSelectProfile}
                  onAddProfile={onNavigateToRegister}
                  onRemoveProfile={onRemoveProfile}
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* Tabs - Desktop */}
            <nav className="hidden md:flex items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  data-tutorial={`tab-${tab.id === 'profile' ? 'perfil' : tab.id === 'analysis' ? 'analise' : tab.id === 'strategies' ? 'estrategias' : tab.id === 'creatives' ? 'criativos' : 'crescimento'}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === 'strategies' && activeProfile.strategies.length > 0 && (
                    <span className="ml-1 w-5 h-5 rounded-full bg-primary-foreground/20 text-xs flex items-center justify-center">
                      {activeProfile.strategies.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2" data-tutorial="user-menu">
              {/* Tutorial Button */}
              <TutorialButton
                onStartInteractive={() => {
                  if (activeTab === 'strategies') {
                    tutorial.startTutorial(strategyTutorial);
                  } else {
                    tutorial.startTutorial(dashboardTutorial);
                  }
                }}
                onShowList={() => {
                  if (activeTab === 'strategies') {
                    tutorial.startListView(strategyTutorial);
                  } else {
                    tutorial.startListView(dashboardTutorial);
                  }
                }}
                variant="outline"
                size="sm"
              />
              {onLogout && <UserHeader onLogout={onLogout} />}
            </div>
          </div>

          {/* Mobile Profile Selector */}
          <div className="md:hidden mt-3">
            <ProfileSelector
              profiles={session.profiles}
              activeProfileId={session.activeProfileId}
              onSelectProfile={onSelectProfile}
              onAddProfile={onNavigateToRegister}
              onRemoveProfile={onRemoveProfile}
              isLoading={isLoading}
            />
          </div>

          {/* Tabs - Mobile */}
          <nav className="flex md:hidden items-center gap-2 mt-4 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <ProfileCard profile={activeProfile.profile} />
            
            {/* Recent Posts Grid */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-display font-semibold mb-4">Posts Recentes</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {activeProfile.profile.recentPosts.slice(0, 6).map((post, index) => (
                  <div key={post.id} className="aspect-square rounded-lg overflow-hidden relative group">
                    <img 
                      src={post.imageUrl} 
                      alt="Post"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${activeProfile.profile?.username}${index}/400/400`;
                      }}
                    />
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-center text-sm">
                        <p>❤️ {post.likes}</p>
                        <p>💬 {post.comments}</p>
                      </div>
                    </div>
                    {!post.hasHumanFace && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" title="Sem rosto humano detectado" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="max-w-3xl mx-auto">
            <AnalysisCard analysis={activeProfile.analysis} />
          </div>
        )}

        {activeTab === 'strategies' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <StrategyGenerator 
              profile={activeProfile.profile}
              analysis={activeProfile.analysis}
              onStrategyGenerated={handleStrategyGenerated}
              existingStrategies={activeProfile.strategies}
              profileId={activeProfile.id}
            />
            
            {activeProfile.strategies.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-display font-bold">Estratégias Geradas</h3>
                {activeProfile.strategies.map((strategy) => (
                  <StrategyDisplay 
                    key={strategy.id}
                    strategy={strategy}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'legendas' && (
          <div className="max-w-3xl mx-auto">
            <CaptionGenerator 
              profileUsername={activeProfile.profile.username}
              niche={activeProfile.analysis?.niche}
            />
          </div>
        )}

        {activeTab === 'growth' && (
          <div className="max-w-3xl mx-auto">
            <GrowthTracker 
              profileSession={activeProfile}
              onUpdate={refreshSession}
            />
          </div>
        )}
      </main>

      {/* Tutorial Overlay */}
      <TutorialOverlay
        isActive={tutorial.isActive}
        currentStep={tutorial.getCurrentStepData()}
        currentStepNumber={tutorial.getCurrentStepNumber()}
        totalSteps={tutorial.getTotalSteps()}
        onNext={tutorial.nextStep}
        onPrev={tutorial.prevStep}
        onStop={tutorial.stopTutorial}
      />

      {/* Tutorial List Modal */}
      <TutorialList
        isOpen={tutorial.showList}
        sections={tutorial.tutorialData}
        onClose={() => tutorial.setShowList(false)}
        onStartInteractive={() => tutorial.startTutorial(tutorial.tutorialData)}
        title={activeTab === 'strategies' ? 'Como Gerar Estratégias' : 'Tutorial do Dashboard'}
      />
    </div>
  );
};
