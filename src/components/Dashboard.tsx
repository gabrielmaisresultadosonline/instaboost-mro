import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MROSession, Strategy, ProfileSession } from '@/types/instagram';
import { ProfileCard } from './ProfileCard';
import { ProfileScreenshotUpload } from './ProfileScreenshotUpload';
import { AnalysisCard } from './AnalysisCard';
import { StrategyGenerator } from './StrategyGenerator';
import { StrategyDisplay } from './StrategyDisplay';
import { CaptionGenerator } from './CaptionGenerator';
import { GrowthTracker } from './GrowthTracker';
import { ProfileSelector } from './ProfileSelector';
import { UserHeader } from './UserHeader';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { TutorialButton } from './TutorialButton';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialList } from './TutorialList';
import { useTutorial, dashboardTutorial, strategyTutorial } from '@/hooks/useTutorial';
import { addStrategy, resetSession, getSession, updateProfile, updateAnalysis, setCloudSyncCallback } from '@/lib/storage';
import { syncSessionToPersistent } from '@/lib/persistentStorage';
import { getCurrentUser, saveUserToCloud } from '@/lib/userStorage';
import { supabase } from '@/integrations/supabase/client';
import { 
  RotateCcw, 
  User, 
  BarChart3, 
  Lightbulb, 
  Type,
  TrendingUp,
  Wrench,
  Lock,
  Camera,
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

  // CRITICAL: Ensure cloud sync callback is set on mount
  useEffect(() => {
    setCloudSyncCallback(saveUserToCloud);
    console.log('📊 [Dashboard] Cloud sync callback configured');
  }, []);

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

  // Check if screenshot exists for analysis tab
  const hasScreenshot = !!activeProfile?.screenshotUrl;

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: <User className="w-4 h-4" />, locked: false },
    { id: 'analysis', label: 'Análise', icon: <BarChart3 className="w-4 h-4" />, locked: !hasScreenshot },
    { id: 'strategies', label: 'Estratégias', icon: <Lightbulb className="w-4 h-4" />, locked: !hasScreenshot },
    { id: 'legendas', label: 'Gerar Legendas', icon: <Type className="w-4 h-4" />, locked: !hasScreenshot },
    { id: 'growth', label: 'Crescimento', icon: <TrendingUp className="w-4 h-4" />, locked: !hasScreenshot },
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
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-3">
          {/* Desktop/Tablet Header */}
          <div className="hidden md:flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1">
              <Logo size="sm" />
              {/* Botão Ferramenta MRO */}
              <Button
                onClick={() => navigate('/mro-ferramenta')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-lg shadow-yellow-500/30 animate-pulse-slow text-xs lg:text-sm px-2 lg:px-4 flex-shrink-0"
                data-tutorial="mro-button"
              >
                <Wrench className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                <span className="hidden lg:inline">Ferramenta MRO</span>
                <span className="lg:hidden">MRO</span>
              </Button>
              <div className="hidden lg:block min-w-0" data-tutorial="profile-selector">
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
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.locked) {
                      import('sonner').then(({ toast }) => {
                        toast.error('Envie um print do perfil primeiro na aba "Perfil"');
                      });
                      return;
                    }
                    setActiveTab(tab.id as Tab);
                  }}
                  data-tutorial={`tab-${tab.id === 'profile' ? 'perfil' : tab.id === 'analysis' ? 'analise' : tab.id === 'strategies' ? 'estrategias' : tab.id === 'creatives' ? 'criativos' : 'crescimento'}`}
                  className={`flex items-center gap-1 xl:gap-2 px-2 xl:px-4 py-2 rounded-lg transition-all duration-300 text-xs xl:text-sm ${
                    tab.locked
                      ? 'text-muted-foreground/50 cursor-not-allowed opacity-60'
                      : activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {tab.locked ? <Lock className="w-3 h-3 xl:w-4 xl:h-4" /> : tab.icon}
                  <span className="hidden xl:inline">{tab.label}</span>
                  {tab.id === 'strategies' && activeProfile.strategies.length > 0 && (
                    <span className="ml-1 w-4 h-4 xl:w-5 xl:h-5 rounded-full bg-primary-foreground/20 text-xs flex items-center justify-center">
                      {activeProfile.strategies.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-1 md:gap-2" data-tutorial="user-menu">
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

          {/* Mobile Header - Layout Vertical */}
          <div className="md:hidden">
            {/* Linha 1: Logo + User */}
            <div className="flex items-center justify-between mb-2">
              <Logo size="sm" />
              <div className="flex items-center gap-1">
                <TutorialButton
                  onStartInteractive={() => tutorial.startTutorial(dashboardTutorial)}
                  onShowList={() => tutorial.startListView(dashboardTutorial)}
                  variant="outline"
                  size="sm"
                />
                {onLogout && <UserHeader onLogout={onLogout} />}
              </div>
            </div>

            {/* Linha 2: Botão MRO + Profile Selector */}
            <div className="flex items-center gap-2 mb-2">
              <Button
                onClick={() => navigate('/mro-ferramenta')}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 h-7 sm:h-8 flex-shrink-0"
                data-tutorial="mro-button"
              >
                <Wrench className="w-3 h-3 mr-1" />
                <span className="hidden xs:inline">Ferramenta </span>MRO
              </Button>
              <div className="flex-1 min-w-0" data-tutorial="profile-selector">
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

            {/* Linha 3: Tabs horizontais scrolláveis */}
            <div className="relative -mx-2">
              <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 px-2 snap-x snap-mandatory scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.locked) {
                        import('sonner').then(({ toast }) => {
                          toast.error('Envie um print do perfil primeiro');
                        });
                        return;
                      }
                      setActiveTab(tab.id as Tab);
                    }}
                    className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-300 whitespace-nowrap text-[10px] sm:text-xs flex-shrink-0 snap-start ${
                      tab.locked
                        ? 'text-muted-foreground/50 cursor-not-allowed opacity-60 bg-secondary/30'
                        : activeTab === tab.id
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    {tab.locked ? <Lock className="w-3 h-3" /> : React.cloneElement(tab.icon as React.ReactElement, { className: 'w-3 h-3' })}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tablet Profile Selector (md-lg screens) */}
          <div className="hidden md:block lg:hidden mt-2">
            <ProfileSelector
              profiles={session.profiles}
              activeProfileId={session.activeProfileId}
              onSelectProfile={onSelectProfile}
              onAddProfile={onNavigateToRegister}
              onRemoveProfile={onRemoveProfile}
              isLoading={isLoading}
            />
          </div>

          {/* Tablet Tabs (md-lg screens) */}
          <nav className="hidden md:flex lg:hidden items-center gap-1 mt-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.locked) {
                    import('sonner').then(({ toast }) => {
                      toast.error('Envie um print do perfil primeiro');
                    });
                    return;
                  }
                  setActiveTab(tab.id as Tab);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-300 whitespace-nowrap text-xs ${
                  tab.locked
                    ? 'text-muted-foreground/50 cursor-not-allowed opacity-60'
                    : activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {tab.locked ? <Lock className="w-3 h-3" /> : React.cloneElement(tab.icon as React.ReactElement, { className: 'w-3 h-3' })}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <ProfileCard 
              profile={activeProfile.profile} 
              onProfileUpdate={(updatedProfile) => {
                // Update profile in session
                updateProfile(updatedProfile);
                refreshSession();
              }}
            />
            
            {/* Profile Screenshot Upload - key força remount quando perfil muda */}
            <ProfileScreenshotUpload
              key={`screenshot-${activeProfile.id}-${activeProfile.profile.username}`}
              username={activeProfile.profile.username}
              squarecloudUsername={getLoggedInUsername()}
              existingScreenshotUrl={activeProfile.screenshotUrl}
              uploadCount={activeProfile.screenshotUploadCount || 0}
              onScreenshotUploaded={(url) => {
                // CRITICAL: Update ONLY the active profile's screenshot
                console.log(`📸 Saving screenshot for @${activeProfile.profile.username} (ID: ${activeProfile.id})`);
                const session = getSession();
                const profileIndex = session.profiles.findIndex(p => p.id === activeProfile.id);
                if (profileIndex !== -1) {
                  const profile = session.profiles[profileIndex];
                  
                  // Add to history for admin
                  const history = profile.screenshotHistory || [];
                  history.push({
                    url,
                    uploadedAt: new Date().toISOString()
                  });
                  
                  // Update screenshot data ONLY for this specific profile
                  session.profiles[profileIndex].screenshotUrl = url;
                  session.profiles[profileIndex].screenshotUploadCount = (profile.screenshotUploadCount || 0) + 1;
                  session.profiles[profileIndex].screenshotHistory = history;
                  
                  console.log(`📸 Screenshot saved for @${profile.profile.username}:`, url);
                  
                  onSessionUpdate(session);
                  syncSessionToPersistent(getLoggedInUsername());
                }
              }}
              onAnalysisComplete={(analysis) => {
                // Update analysis with new data from screenshot
                if (analysis) {
                  updateAnalysis(analysis);
                  refreshSession();
                }
              }}
            />
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="max-w-3xl mx-auto">
            {hasScreenshot ? (
              <AnalysisCard analysis={activeProfile.analysis} />
            ) : (
              <div className="glass-card glow-border p-8 text-center">
                <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-display font-bold mb-2">Análise Bloqueada</h3>
                <p className="text-muted-foreground mb-4">
                  Para acessar a análise completa do perfil, você precisa enviar um print do perfil primeiro.
                </p>
                <Button 
                  onClick={() => setActiveTab('profile')}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Ir para Envio de Print
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'strategies' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {hasScreenshot ? (
              <>
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
              </>
            ) : (
              <div className="glass-card glow-border p-8 text-center">
                <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-display font-bold mb-2">Estratégias Bloqueadas</h3>
                <p className="text-muted-foreground mb-4">
                  Para gerar estratégias personalizadas, você precisa enviar um print do perfil primeiro.
                </p>
                <Button 
                  onClick={() => setActiveTab('profile')}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Ir para Envio de Print
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'legendas' && (
          <div className="max-w-3xl mx-auto">
            {hasScreenshot ? (
              <CaptionGenerator 
                profileUsername={activeProfile.profile.username}
                niche={activeProfile.analysis?.niche}
              />
            ) : (
              <div className="glass-card glow-border p-8 text-center">
                <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-display font-bold mb-2">Legendas Bloqueadas</h3>
                <p className="text-muted-foreground mb-4">
                  Para gerar legendas personalizadas, você precisa enviar um print do perfil primeiro.
                </p>
                <Button 
                  onClick={() => setActiveTab('profile')}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Ir para Envio de Print
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'growth' && (
          <div className="max-w-3xl mx-auto">
            {hasScreenshot ? (
              <GrowthTracker 
                key={`growth-${activeProfile.id}-${activeProfile.profile.username}`}
                profileSession={activeProfile}
                onUpdate={refreshSession}
              />
            ) : (
              <div className="glass-card glow-border p-8 text-center">
                <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-display font-bold mb-2">Crescimento Bloqueado</h3>
                <p className="text-muted-foreground mb-4">
                  Para acompanhar o crescimento do perfil, você precisa enviar um print do perfil primeiro.
                </p>
                <Button 
                  onClick={() => setActiveTab('profile')}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Ir para Envio de Print
                </Button>
              </div>
            )}
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
