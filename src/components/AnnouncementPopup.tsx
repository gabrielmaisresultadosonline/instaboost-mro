import { useState, useEffect, useRef, useCallback } from 'react';
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

interface AnnouncementPopupProps {
  onComplete?: () => void;
}

const STORAGE_KEY = 'mro_viewed_announcements';

const AnnouncementPopup = ({ onComplete }: AnnouncementPopupProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [canClose, setCanClose] = useState(true);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);
  const announcementsRef = useRef<Announcement[]>([]);

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
    if (announcement.maxViews === 99) return true;
    
    return viewedRecord.viewCount < announcement.maxViews;
  };

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('📢 Carregando avisos do servidor...');
      const { data, error } = await supabase.storage
        .from('user-data')
        .download('admin/announcements.json');
      
      if (error) {
        console.log('📢 Nenhum aviso encontrado:', error.message);
        setIsLoading(false);
        onComplete?.();
        return;
      }

      const text = await data.text();
      const parsed = JSON.parse(text);
      const activeAnnouncements = (parsed.announcements || [])
        .filter((a: Announcement) => a.isActive)
        .filter((a: Announcement) => shouldShowAnnouncement(a));

      console.log(`📢 ${activeAnnouncements.length} avisos ativos para exibir`);
      
      if (activeAnnouncements.length === 0) {
        setIsLoading(false);
        onComplete?.();
        return;
      }

      setAnnouncements(activeAnnouncements);
      announcementsRef.current = activeAnnouncements;
      showAnnouncement(activeAnnouncements[0]);
    } catch (error) {
      console.error('📢 Erro ao carregar avisos:', error);
      onComplete?.();
    } finally {
      setIsLoading(false);
    }
  }, [onComplete]);

  useEffect(() => {
    if (!hasTriggered.current) {
      hasTriggered.current = true;
      loadAnnouncements();
    }
  }, [loadAnnouncements]);

  const showAnnouncement = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setIsVisible(true);
    setHasScrolledToEnd(false);
    
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
      
      const currentIndex = announcementsRef.current.findIndex(a => a.id === currentAnnouncement.id);
      const nextAnnouncement = announcementsRef.current[currentIndex + 1];
      
      if (nextAnnouncement) {
        showAnnouncement(nextAnnouncement);
      } else {
        setIsVisible(false);
        setCurrentAnnouncement(null);
        onComplete?.();
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

  useEffect(() => {
    if (contentRef.current && currentAnnouncement?.forceRead) {
      const { scrollHeight, clientHeight } = contentRef.current;
      if (scrollHeight <= clientHeight) {
        setHasScrolledToEnd(true);
        setCanClose(true);
      }
    }
  }, [currentAnnouncement]);

  if (!isVisible || !currentAnnouncement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border-primary/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
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
              className="w-full rounded-lg object-contain max-h-80"
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
        <div className="p-4 border-t border-border bg-secondary/30">
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
