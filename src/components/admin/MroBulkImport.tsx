import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseMroUsers } from '@/lib/mroUsersParser';
import { ClipboardPaste, Loader2, Upload } from 'lucide-react';

interface MroBulkImportProps {
  onImported: () => void;
}

/** Aba de importação em massa: cola o texto exportado e cadastra tudo. */
const MroBulkImport: React.FC<MroBulkImportProps> = ({ onImported }) => {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(() => parseMroUsers(text), [text]);
  const totalAccounts = useMemo(
    () => parsed.reduce((sum, u) => sum + u.accounts.length, 0),
    [parsed],
  );

  const handleImport = async () => {
    if (!parsed.length) {
      toast({ title: 'Nada para importar', description: 'Cole a lista de usuários primeiro.', variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('mro-tool-api', {
        body: { action: 'bulk_import', users: parsed },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha na importação');

      toast({
        title: 'Importação concluída',
        description: `${data.created} criados · ${data.updated} atualizados · ${data.accounts_added} contas vinculadas.`,
      });
      if (Array.isArray(data.errors) && data.errors.length) {
        console.warn('[mro-bulk-import] erros:', data.errors);
      }
      setText('');
      onImported();
    } catch (err) {
      toast({
        title: 'Erro ao importar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Colar usuários</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Cole exatamente no formato exportado (Usuário / Senha / Tempo de Expiração / Contas associadas / Lista de Testes).
          O sistema organiza tudo automaticamente. Usuários já existentes são atualizados.
        </p>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          placeholder={'Usuário: exemplo\n\nSenha: exemplo\n\nTempo de Expiração: 9999333\n\nContas associadas:\nminhaconta\n×\n\nLista de Testes:'}
          className="font-mono text-xs"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{parsed.length} usuários detectados</Badge>
          <Badge variant="secondary">{totalAccounts} contas de Instagram</Badge>
          <div className="flex-1" />
          <Button onClick={handleImport} disabled={importing || !parsed.length} className="gap-2">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar {parsed.length ? `(${parsed.length})` : ''}
          </Button>
        </div>
      </Card>

      {parsed.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3 text-sm">Prévia</h4>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {parsed.slice(0, 60).map((u) => (
              <div key={u.username} className="text-xs border rounded-md p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{u.username}</span>
                  <Badge variant="outline">
                    {u.expiration_days >= 999999 ? 'Vitalício' : `${u.expiration_days} dias`}
                  </Badge>
                  <span className="text-muted-foreground">{u.accounts.length} conta(s)</span>
                </div>
                {u.accounts.length > 0 && (
                  <p className="text-muted-foreground mt-1 break-all">{u.accounts.join(', ')}</p>
                )}
              </div>
            ))}
            {parsed.length > 60 && (
              <p className="text-xs text-muted-foreground">+ {parsed.length - 60} usuários...</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MroBulkImport;
