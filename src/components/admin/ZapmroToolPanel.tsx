import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ModuleManager from '@/components/admin/ModuleManager';
import ZapmroAPIDocumentation from '@/components/admin/ZapmroAPIDocumentation';
import { ZapmroUsersTab, ZapmroAnnouncementsTab } from '@/components/admin/ZapmroUsersPanel';
import ZapmroSessionsTab from '@/components/admin/ZapmroSessionsPanel';
import { BookOpen, Users, Megaphone, FileCode, Wifi } from 'lucide-react';

type SubTab = 'tutorials' | 'users' | 'sessions' | 'announcements' | 'docs';

interface ZapmroToolPanelProps {
  downloadLink: string;
  onDownloadLinkChange: (link: string) => void;
  onSaveSettings: () => void;
}

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'tutorials', label: 'Tutoriais', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" /> },
  { id: 'sessions', label: 'Acessos / IPs', icon: <Wifi className="w-4 h-4" /> },
  { id: 'announcements', label: 'Avisos', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'docs', label: 'Documentação', icon: <FileCode className="w-4 h-4" /> },
];

/** Container da seção "ZAPMRO Ferramenta" com abas internas. */
const ZapmroToolPanel: React.FC<ZapmroToolPanelProps> = ({
  downloadLink,
  onDownloadLinkChange,
  onSaveSettings,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('tutorials');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {SUB_TABS.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={subTab === tab.id ? 'default' : 'outline'}
            className={cn('gap-2')}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {subTab === 'tutorials' && (
        <ModuleManager
          downloadLink={downloadLink}
          onDownloadLinkChange={onDownloadLinkChange}
          onSaveSettings={onSaveSettings}
          platform="zapmro"
        />
      )}

      {subTab === 'users' && <ZapmroUsersTab />}
      {subTab === 'sessions' && <ZapmroSessionsTab />}
      {subTab === 'announcements' && <ZapmroAnnouncementsTab />}
      {subTab === 'docs' && <ZapmroAPIDocumentation />}
    </div>
  );
};

export default ZapmroToolPanel;
