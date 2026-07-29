import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseZapmroUsers, ZAPMRO_LIFETIME_DAYS } from '@/lib/zapmroUsersParser';
import { ClipboardPaste, Loader2, Upload } from 'lucide-react';

interface ZapmroBulkImportProps {
  onImported?: () => void;
}

/** Aba de importação em massa de usuários ZAPMRO (colar lista exportada). */
const ZapmroBulkImport: React.FC<ZapmroBulkImportProps> = ({ onImported }) => {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const parsed = useMemo(() => parseZapmroUsers(text), [text]);

  /** Lotes pequenos evitam timeout da edge function. */
  const BATCH_SIZE = 50;

  const handleImport = async () => {
    if (!parsed.length) {
      toast({
        title: 'Nada para importar',
        description: 'Cole a lista de usuários primeiro.',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    setProgress({ done: 0, total: parsed.length });

    const totals = { created: 0, updated: 0 };
    const allErrors: string[] = [];

    try {
      for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
        const batch = parsed.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase.functions.invoke('zapmro-api', {
          body: { action: 'bulk_import_users', users: batch },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Falha na importação');

        totals.created += Number(data.created || 0);
        totals.updated += Number(data.updated || 0);
        if (Array.isArray(data.errors)) allErrors.push(...data.errors);

        setProgress({ done: Math.min(i + BATCH_SIZE, parsed.length), total: parsed.length });
      }

      toast({
        title: 'Importação concluída',
        description: `${totals.created} criados · ${totals.updated} atualizados${
          allErrors.length ? ` · ${allErrors.length} avisos` : ''
        }.`,
      });
      if (allErrors.length) console.warn('[zapmro-bulk-import] erros:', allErrors);
      setText('');
      onImported?.();
    } catch (err) {
      toast({
        title: 'Erro ao importar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const lifetimeCount = parsed.filter((u) => u.days_remaining >= ZAPMRO_LIFETIME_DAYS).length;
  const expiredCount = parsed.filter((u) => !u.is_active).length;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Colar usuários ZAPMRO</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Cole exatamente no formato exportado (Usuário / Senha / Cadastro / Plano / Status). O sistema organiza tudo
          automaticamente. Pode colar a lista completa quantas vezes quiser: quem já existe é atualizado e quem falta é
          criado.
        </p>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          placeholder={
            '--- Usuário #1 ---\n👤 Usuário:    gleisonvipfull\n🔑 Senha:      gleisonvipfull\n📅 Cadastro:   28/05/2026\n📋 Plano:      Anual (302 dias restantes)\n⚡ Status:     Ativo (302 dias)'
          }
          className="font-mono text-xs"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{parsed.length} usuários detectados</Badge>
          <Badge variant="secondary">{lifetimeCount} vitalícios</Badge>
          <Badge variant="secondary">{expiredCount} expirados</Badge>
          <div className="flex-1" />
          <Button onClick={handleImport} disabled={importing || !parsed.length} className="gap-2">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing && progress
              ? `Importando ${progress.done}/${progress.total}...`
              : `Importar ${parsed.length ? `(${parsed.length})` : ''}`}
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
                    {u.days_remaining >= ZAPMRO_LIFETIME_DAYS ? 'Vitalício' : `${u.days_remaining} dias`}
                  </Badge>
                  {!u.is_active && <Badge variant="destructive">Expirado</Badge>}
                  <span className="text-muted-foreground">senha: {u.password ? '••••••' : '—'}</span>
                </div>
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

export default ZapmroBulkImport;
