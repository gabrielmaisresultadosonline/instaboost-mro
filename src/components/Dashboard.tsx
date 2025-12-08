import { useState, useEffect } from 'react';
import { MROSession, Strategy, Creative } from '@/types/instagram';
import { ProfileCard } from './ProfileCard';
import { AnalysisCard } from './AnalysisCard';
import { StrategyGenerator } from './StrategyGenerator';
import { StrategyDisplay } from './StrategyDisplay';
import { CreativeGenerator } from './CreativeGenerator';
import { CreativesGallery } from './CreativesGallery';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { addStrategy, addCreative, resetSession, cleanExpiredCreatives, getSession } from '@/lib/storage';
import { 
  RotateCcw, 
  User, 
  BarChart3, 
  Lightbulb, 
  Image as ImageIcon,
} from 'lucide-react';

interface DashboardProps {
  session: MROSession;
  onSessionUpdate: (session: MROSession) => void;
  onReset: () => void;
}

type Tab = 'profile' | 'analysis' | 'strategies' | 'creatives';

export const Dashboard = ({ session, onSessionUpdate, onReset }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [showCreativeGenerator, setShowCreativeGenerator] = useState(false);

  // Clean expired creatives on mount
  useEffect(() => {
    cleanExpiredCreatives();
    const updatedSession = getSession();
    if (updatedSession.creatives.length !== session.creatives.length) {
      onSessionUpdate(updatedSession);
    }
  }, []);

  const refreshSession = () => {
    const updatedSession = getSession();
    onSessionUpdate(updatedSession);
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: <User className="w-4 h-4" /> },
    { id: 'analysis', label: 'Análise', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'strategies', label: 'Estratégias', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'creatives', label: 'Criativos', icon: <ImageIcon className="w-4 h-4" /> },
  ];

  const handleStrategyGenerated = (strategy: Strategy) => {
    addStrategy(strategy);
    onSessionUpdate({
      ...session,
      strategies: [...session.strategies, strategy],
    });
  };

  const handleGenerateCreative = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setShowCreativeGenerator(true);
  };

  const handleCreativeGenerated = (creative: Creative) => {
    addCreative(creative);
    onSessionUpdate({
      ...session,
      creatives: [...session.creatives, creative],
      creativesRemaining: session.creativesRemaining - 1,
    });
    setShowCreativeGenerator(false);
    setActiveTab('creatives');
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja resetar todas as informações? Esta ação não pode ser desfeita.')) {
      resetSession();
      onReset();
    }
  };

  if (!session.profile || !session.analysis) {
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
              <div className="hidden md:block">
                <p className="text-sm text-muted-foreground">Analisando:</p>
                <p className="font-semibold">@{session.profile.username}</p>
              </div>
            </div>

            {/* Tabs - Desktop */}
            <nav className="hidden md:flex items-center gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === 'strategies' && session.strategies.length > 0 && (
                    <span className="ml-1 w-5 h-5 rounded-full bg-primary-foreground/20 text-xs flex items-center justify-center">
                      {session.strategies.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
              Resetar
            </Button>
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
            <ProfileCard profile={session.profile} />
            
            {/* Recent Posts Grid */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-display font-semibold mb-4">Posts Recentes</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {session.profile.recentPosts.slice(0, 6).map((post, index) => (
                  <div key={post.id} className="aspect-square rounded-lg overflow-hidden relative group">
                    <img 
                      src={post.imageUrl} 
                      alt="Post"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/seed/${session.profile?.username}${index}/400/400`;
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
            <AnalysisCard analysis={session.analysis} />
          </div>
        )}

        {activeTab === 'strategies' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <StrategyGenerator 
              profile={session.profile}
              analysis={session.analysis}
              onStrategyGenerated={handleStrategyGenerated}
              existingStrategies={session.strategies}
            />
            
            {session.strategies.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-display font-bold">Estratégias Geradas</h3>
                {session.strategies.map((strategy) => (
                  <StrategyDisplay 
                    key={strategy.id}
                    strategy={strategy}
                    onGenerateCreative={handleGenerateCreative}
                    creativesRemaining={session.creativesRemaining}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'creatives' && (
          <div className="max-w-4xl mx-auto">
            <CreativesGallery 
              creatives={session.creatives}
              creativesRemaining={session.creativesRemaining}
              onUpdate={refreshSession}
            />
          </div>
        )}
      </main>

      {/* Creative Generator Modal */}
      {showCreativeGenerator && selectedStrategy && session.profile && session.analysis && (
        <CreativeGenerator
          strategy={selectedStrategy}
          profile={session.profile}
          niche={session.analysis.niche}
          onCreativeGenerated={handleCreativeGenerated}
          onClose={() => setShowCreativeGenerator(false)}
        />
      )}
    </div>
  );
};
