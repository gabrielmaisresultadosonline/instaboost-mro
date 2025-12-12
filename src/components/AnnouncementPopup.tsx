import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { X, Bell, ChevronDown } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  thumbnailUrl?: string;
  isActive: boolean;
  forceRead: boolean;
  maxViews: number;
  createdAt: string;
}

interface ViewedAnnouncement {
  id: string;
  viewCount: number;
  lastViewed: string;
}

const STORAGE_KEY = 'mro_viewed_announcements';

const AnnouncementPopup = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [canClose, setCanClose] = useState(true);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const getViewedAnnouncements = (): ViewedAnnouncement[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveViewedAnnouncement = (id: string) => {
    const viewed = getViewedAnnouncements();
    const existing = viewed.find(v => v.id === id);
    
    if (existing) {
      existing.viewCount += 1;
      existing.lastViewed = new Date().toISOString();
    } else {
      viewed.push({
        id,
        viewCount: 1,
        lastViewed: new Date().toISOString()
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(viewed));
  };

  const shouldShowAnnouncement = (announcement: Announcement): boolean => {
    const viewed = getViewedAnnouncements();
    const viewedRecord = viewed.find(v => v.id === announcement.id);
    
    if (!viewedRecord) return true;
    if (announcement.maxViews === 99) return true; // Always show
    
    return viewedRecord.viewCount < announcement.maxViews;
  };

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('user-data')
        .download('admin/announcements.json');
      
      if (error) {
        console.log('📢 Nenhum aviso para exibir');
        return;
      }

      const text = await data.text();
      const parsed = JSON.parse(text);
      const activeAnnouncements = (parsed.announcements || [])
        .filter((a: Announcement) => a.isActive)
        .filter((a: Announcement) => shouldShowAnnouncement(a));

      setAnnouncements(activeAnnouncements);

      // Show the first unread announcement
      if (activeAnnouncements.length > 0) {
        showAnnouncement(activeAnnouncements[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar avisos:', error);
    }
  };

  const showAnnouncement = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setIsVisible(true);
    setHasScrolledToEnd(false);
    
    // If forceRead, user must scroll to end
    if (announcement.forceRead) {
      setCanClose(false);
    } else {
      setCanClose(true);
    }
  };

  const handleClose = () => {
    if (!canClose) return;
    
    if (currentAnnouncement) {
      saveViewedAnnouncement(currentAnnouncement.id);
      
      // Show next announcement if any
      const currentIndex = announcements.findIndex(a => a.id === currentAnnouncement.id);
      const nextAnnouncement = announcements[currentIndex + 1];
      
      if (nextAnnouncement) {
        showAnnouncement(nextAnnouncement);
      } else {
        setIsVisible(false);
        setCurrentAnnouncement(null);
      }
    }
  };

  const handleScroll = () => {
    if (!contentRef.current || !currentAnnouncement?.forceRead) return;
    
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    
    if (isAtBottom && !hasScrolledToEnd) {
      setHasScrolledToEnd(true);
      setCanClose(true);
    }
  };

  if (!isVisible || !currentAnnouncement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">{currentAnnouncement.title}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={!canClose}
            className={!canClose ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {currentAnnouncement.thumbnailUrl && (
            <img 
              src={currentAnnouncement.thumbnailUrl} 
              alt="" 
              className="w-full rounded-lg object-cover max-h-64"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          )}
          
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {currentAnnouncement.content}
          </div>

          {currentAnnouncement.forceRead && !hasScrolledToEnd && (
            <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
              <ChevronDown className="w-6 h-6 animate-bounce" />
              <span className="text-sm">Role para baixo para continuar</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          {currentAnnouncement.forceRead && !canClose ? (
            <p className="text-sm text-center text-muted-foreground">
              📖 Role o conteúdo até o final para fechar
            </p>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Entendido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
