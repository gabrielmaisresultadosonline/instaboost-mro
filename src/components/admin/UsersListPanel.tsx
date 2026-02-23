import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Download, Image, User, Mail, Calendar, Instagram, Search, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';

interface IgEntry {
  username: string;
  screenshot_url: string | null;
  registered_at: string;
}

interface MergedUser {
  squarecloud_username: string;
  email: string | null;
  first_registered: string;
  instagrams: IgEntry[];
  days_since_first: number;
}

const UsersListPanel = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_print' | 'without_print'>('all');
  const [downloadingAll, setDownloadingAll] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log('[UsersListPanel] Fetching users list...');
      const { data, error } = await supabase.functions.invoke('get-users-list');
      
      console.log('[UsersListPanel] Response:', { data: data ? 'received' : 'null', error, usersCount: data?.users?.length });
      
      if (error) {
        console.error('[UsersListPanel] Supabase error:', error);
        throw error;
      }

      if (data?.success && data.users) {
        const enriched: MergedUser[] = data.users.map((u: any) => ({
          ...u,
          days_since_first: Math.floor((Date.now() - new Date(u.first_registered).getTime()) / 86400000),
        }));
        setUsers(enriched);
        console.log('[UsersListPanel] Loaded', enriched.length, 'users');
      } else {
        console.warn('[UsersListPanel] No users in response:', data);
      }
    } catch (error: any) {
      console.error('[UsersListPanel] Error:', error);
      toast({ title: 'Erro', description: error?.message || 'Não foi possível carregar a lista', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.squarecloud_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.instagrams.some(ig => ig.username.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'with_print') return u.instagrams.some(ig => ig.screenshot_url);
    if (filterType === 'without_print') return u.instagrams.every(ig => !ig.screenshot_url);
    return true;
  });

  const totalWithPrint = users.filter(u => u.instagrams.some(ig => ig.screenshot_url)).length;
  const totalWithoutPrint = users.filter(u => u.instagrams.every(ig => !ig.screenshot_url)).length;

  const downloadSinglePrint = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível baixar o print', variant: 'destructive' });
    }
  };

  const createStoryImage = (img: HTMLImageElement, username: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const W = 1080;
      const H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      // Draw the screenshot centered, covering the canvas
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const sx = (W - sw) / 2;
      const sy = (H - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh);

      // Semi-transparent overlay at top for text
      const gradient = ctx.createLinearGradient(0, 0, 0, 220);
      gradient.addColorStop(0, 'rgba(0,0,0,0.8)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, 220);

      // "Cliente Ativo ✅" text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 64px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cliente Ativo ✅', W / 2, 100);

      // Username below
      ctx.font = '36px Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(`@${username}`, W / 2, 160);

      canvas.toBlob((blob) => resolve(blob!), 'image/png', 1);
    });
  };

  const downloadAllPrints = async () => {
    setDownloadingAll(true);
    const screenshots = filteredUsers.flatMap(u =>
      u.instagrams.filter(ig => ig.screenshot_url).map(ig => ({
        url: ig.screenshot_url!,
        name: `${u.squarecloud_username}_${ig.username}`,
        igUsername: ig.username,
      }))
    );

    if (screenshots.length === 0) {
      toast({ title: 'Nenhum print', description: 'Não há prints para baixar', variant: 'destructive' });
      setDownloadingAll(false);
      return;
    }

    try {
      const zip = new JSZip();
      let processed = 0;

      for (const s of screenshots) {
        try {
          const response = await fetch(s.url);
          const blob = await response.blob();
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new window.Image();
            i.crossOrigin = 'anonymous';
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = URL.createObjectURL(blob);
          });

          const storyBlob = await createStoryImage(img, s.igUsername);
          zip.file(`${s.name}.png`, storyBlob);
          processed++;
          
          // Small delay to avoid overwhelming
          if (processed % 5 === 0) {
            await new Promise(r => setTimeout(r, 100));
          }
        } catch (err) {
          console.warn(`Falha ao processar ${s.name}:`, err);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `clientes_ativos_stories_${new Date().toISOString().slice(0,10)}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({ title: 'ZIP criado!', description: `${processed} prints em formato stories baixados` });
    } catch (err) {
      console.error('Erro ao criar ZIP:', err);
      toast({ title: 'Erro', description: 'Falha ao criar o arquivo ZIP', variant: 'destructive' });
    }

    setDownloadingAll(false);
  };

  const getFirstPrintDate = (u: MergedUser): string => {
    const withPrint = u.instagrams.filter(ig => ig.screenshot_url);
    if (withPrint.length === 0) return 'Sem print';
    const sorted = withPrint.sort((a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime());
    return new Date(sorted[0].registered_at).toLocaleDateString('pt-BR');
  };

  const exportCSV = (type: 'full' | 'simple') => {
    let rows: string[][];
    if (type === 'simple') {
      rows = [['Usuário', 'Primeiro Cadastro']];
      for (const u of filteredUsers) {
        rows.push([
          u.squarecloud_username,
          new Date(u.first_registered).toLocaleDateString('pt-BR'),
        ]);
      }
    } else {
      rows = [['Usuário', 'Email', 'Primeiro Cadastro', 'Dias desde cadastro', 'Data Primeiro Print', 'Instagrams', 'Tem Print']];
      for (const u of filteredUsers) {
        rows.push([
          u.squarecloud_username,
          u.email || 'N/A',
          new Date(u.first_registered).toLocaleDateString('pt-BR'),
          String(u.days_since_first),
          getFirstPrintDate(u),
          u.instagrams.map(ig => ig.username).join('; '),
          u.instagrams.some(ig => ig.screenshot_url) ? 'Sim' : 'Não',
        ]);
      }
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = type === 'simple' ? 'usuarios_simples.csv' : 'usuarios_completo.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast({ title: 'CSV exportado!', description: `${filteredUsers.length} usuários exportados` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando lista de usuários...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <User className="w-6 h-6 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">{users.length}</p>
          <p className="text-xs text-muted-foreground">Total Usuários</p>
        </div>
        <div className="glass-card p-4 text-center">
          <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-2" />
          <p className="text-2xl font-bold">{totalWithPrint}</p>
          <p className="text-xs text-muted-foreground">Com Print</p>
        </div>
        <div className="glass-card p-4 text-center">
          <XCircle className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
          <p className="text-2xl font-bold">{totalWithoutPrint}</p>
          <p className="text-xs text-muted-foreground">Sem Print</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário, email ou @instagram..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>
          <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'with_print', label: 'Com Print' },
              { key: 'without_print', label: 'Sem Print' },
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterType(f.key as any)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  filterType === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV('full')}>
            <Download className="w-4 h-4 mr-1" /> CSV Completo
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV('simple')}>
            <Download className="w-4 h-4 mr-1" /> Só Usuários + Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAllPrints}
            disabled={downloadingAll}
          >
            <Image className="w-4 h-4 mr-1" />
            {downloadingAll ? 'Baixando...' : 'Todos Prints'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Mostrando {filteredUsers.length} de {users.length} usuários
      </p>

      {/* User List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <div key={user.squarecloud_username} className="glass-card p-4 space-y-3">
            {/* User header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <User className="w-5 h-5 text-primary shrink-0" />
                <span className="font-bold text-lg">{user.squarecloud_username}</span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {user.email || 'Email não informado'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {new Date(user.first_registered).toLocaleDateString('pt-BR')}
                </span>
                <span className="px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
                  {user.days_since_first} dias
                </span>
              </div>
            </div>

            {/* Instagram accounts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {user.instagrams.map((ig) => (
                <div key={ig.username} className="border border-border rounded-lg p-3 bg-secondary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    <span className="font-medium text-sm">@{ig.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(ig.registered_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  {ig.screenshot_url ? (
                    <div className="space-y-2">
                      <a href={ig.screenshot_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={ig.screenshot_url}
                          alt={`Print @${ig.username}`}
                          className="w-full h-40 object-cover rounded-md border border-border cursor-pointer hover:opacity-80 transition-opacity"
                          loading="lazy"
                        />
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => downloadSinglePrint(ig.screenshot_url!, `${user.squarecloud_username}_${ig.username}.png`)}
                      >
                        <Download className="w-3 h-3 mr-1" /> Baixar Print
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-secondary/50 rounded-md flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Sem print</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum usuário encontrado
        </div>
      )}
    </div>
  );
};

export default UsersListPanel;
