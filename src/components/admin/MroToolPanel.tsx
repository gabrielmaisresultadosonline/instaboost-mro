import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ModuleManager from '@/components/admin/ModuleManager';
import MroUsersPanel from '@/components/admin/MroUsersPanel';
import MroBulkImport from '@/components/admin/MroBulkImport';
import MroApiDocumentation from '@/components/admin/MroApiDocumentation';
import ExtensionPostgresDocs from '@/components/admin/ExtensionPostgresDocs';
import { BookOpen, Users, ClipboardPaste, FileCode, Database } from 'lucide-react';

type SubTab = 'tutorials' | 'users' | 'import' | 'docs' | 'docs-pg';

interface MroToolPanelProps {
  downloadLink: string;
  onDownloadLinkChange: (link: string) => void;
  onSaveSettings: () => void;
}

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'tutorials', label: 'Tutoriais', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" /> },
  { id: 'import', label: 'Colar usuários', icon: <ClipboardPaste className="w-4 h-4" /> },
  { id: 'docs', label: 'Documentação (Supabase)', icon: <FileCode className="w-4 h-4" /> },
  { id: 'docs-pg', label: 'Documentação (PostgreSQL)', icon: <Database className="w-4 h-4" /> },
];

/** Container da seção "MRO Ferramenta" com abas internas. */
const MroToolPanel: React.FC<MroToolPanelProps> = ({ downloadLink, onDownloadLinkChange, onSaveSettings }) => {
  const [subTab, setSubTab] = useState<SubTab>('tutorials');
  const [reloadKey, setReloadKey] = useState(0);

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
        />
      )}

      {subTab === 'users' && <MroUsersPanel key={reloadKey} />}

      {subTab === 'import' && (
        <MroBulkImport
          onImported={() => {
            setReloadKey((k) => k + 1);
            setSubTab('users');
          }}
        />
      )}

      {subTab === 'docs' && <MroApiDocumentation />}

      {subTab === 'docs-pg' && <ExtensionPostgresDocs tool="mro" />}
    </div>
  );
};

export default MroToolPanel;
