import { useState, useRef } from 'react';
import { getAdminData, saveAdminData, FacebookPixelSettings, CallPageSettings } from '@/lib/adminConfig';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, Upload, Loader2, Check, Phone, ExternalLink, 
  Volume2, Play, Trash2, Facebook
} from 'lucide-react';

const PixelAndCallSettings = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const ringtoneInputRef = useRef<HTMLInputElement>(null);
  
  const adminData = getAdminData();
  const [callSettings, setCallSettings] = useState<CallPageSettings>(
    adminData.settings.callPageSettings || {
      audioUrl: 'https://maisresultadosonline.com.br/3b301aa2-e372-4b47-b35b-34d4b55bcdd9.mp3',
      ringtoneUrl: 'http://maisresultadosonline.com.br/1207.mp4'
    }
  );
  
  const [pixelSettings, setPixelSettings] = useState<FacebookPixelSettings>(
    adminData.settings.pixelSettings || {
      pixelId: '569414052132145',
      enabled: true,
      trackPageView: true,
      trackLead: true,
      trackViewContent: true,
      customEvents: []
    }
  );

  const [testingPixel, setTestingPixel] = useState(false);

  const handleUploadAudio = async (file: File, type: 'audio' | 'ringtone') => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const fileName = `call-${type}-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `call-audio/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('assets')
        .upload(filePath, file, { upsert: true });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from('assets').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      
      if (type === 'audio') {
        setCallSettings(prev => ({ ...prev, audioUrl: publicUrl }));
      } else {
        setCallSettings(prev => ({ ...prev, ringtoneUrl: publicUrl }));
      }
      
      toast({ title: "Upload concluído!", description: `${type === 'audio' ? 'Áudio' : 'Toque'} atualizado com sucesso.` });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Erro no upload", description: "Não foi possível fazer o upload do arquivo.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    const data = getAdminData();
    data.settings.callPageSettings = callSettings;
    data.settings.pixelSettings = pixelSettings;
    saveAdminData(data);
    toast({ title: "Salvo!", description: "Configurações de Pixel e Ligação atualizadas." });
  };

  const testPixel = () => {
    setTestingPixel(true);
    
    // Fire a test event
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
      toast({ 
        title: "Evento enviado!", 
        description: "PageView disparado. Verifique no Facebook Events Manager." 
      });
    } else {
      toast({ 
        title: "Pixel não encontrado", 
        description: "O Facebook Pixel não está carregado na página.", 
        variant: "destructive" 
      });
    }
    
    setTimeout(() => setTestingPixel(false), 1000);
  };

  const playPreview = (url: string) => {
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(console.error);
    setTimeout(() => audio.pause(), 5000); // Stop after 5 seconds preview
  };

  return (
    <div className="space-y-8">
      {/* Facebook Pixel Configuration */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <Facebook className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Facebook Pixel</h3>
            <p className="text-sm text-muted-foreground">Configure o rastreamento de eventos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>ID do Pixel</Label>
              <Input
                value={pixelSettings.pixelId}
                onChange={(e) => setPixelSettings(prev => ({ ...prev, pixelId: e.target.value }))}
                placeholder="Ex: 569414052132145"
                className="bg-secondary/50 mt-1 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encontre no Facebook Business → Events Manager
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={pixelSettings.enabled}
                onCheckedChange={(checked) => setPixelSettings(prev => ({ ...prev, enabled: checked }))}
              />
              <Label>Ativar Facebook Pixel</Label>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
            <h4 className="font-medium">Eventos Automáticos</h4>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={pixelSettings.trackPageView}
                  onCheckedChange={(checked) => setPixelSettings(prev => ({ ...prev, trackPageView: checked }))}
                />
                <div>
                  <Label className="text-sm">PageView</Label>
                  <p className="text-xs text-muted-foreground">Dispara em todas as páginas</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={pixelSettings.trackLead}
                  onCheckedChange={(checked) => setPixelSettings(prev => ({ ...prev, trackLead: checked }))}
                />
                <div>
                  <Label className="text-sm">Lead</Label>
                  <p className="text-xs text-muted-foreground">Dispara em cadastros</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={pixelSettings.trackViewContent}
                  onCheckedChange={(checked) => setPixelSettings(prev => ({ ...prev, trackViewContent: checked }))}
                />
                <div>
                  <Label className="text-sm">ViewContent</Label>
                  <p className="text-xs text-muted-foreground">Dispara ao clicar no CTA</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            type="button"
            variant="outline"
            onClick={testPixel}
            disabled={testingPixel}
            className="cursor-pointer"
          >
            {testingPixel ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
            Testar Pixel
          </Button>
          <a 
            href={`https://www.facebook.com/events_manager2/list/pixel/${pixelSettings.pixelId}/test_events`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-secondary/50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Events Manager
          </a>
        </div>

        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-400">
            <strong>Dica:</strong> O código base do Pixel já está no index.html. Os eventos serão disparados automaticamente nas páginas configuradas.
            Use o "Testar Eventos" no Facebook para verificar se os eventos estão chegando.
          </p>
        </div>
      </div>

      {/* Call Page Audio Configuration */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Página de Ligação (/ligacao)</h3>
            <p className="text-sm text-muted-foreground">Configure áudios da simulação de chamada</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Audio */}
          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              <h4 className="font-medium">Áudio Principal</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Áudio que toca quando o usuário atende a "chamada"
            </p>
            
            <Input
              value={callSettings.audioUrl}
              onChange={(e) => setCallSettings(prev => ({ ...prev, audioUrl: e.target.value }))}
              placeholder="URL do áudio (MP3)"
              className="bg-secondary/50 font-mono text-xs"
            />
            
            <div className="flex gap-2">
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadAudio(file, 'audio');
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => audioInputRef.current?.click()}
                disabled={isUploading}
                className="cursor-pointer"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                Upload
              </Button>
              {callSettings.audioUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => playPreview(callSettings.audioUrl)}
                  className="cursor-pointer"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Preview
                </Button>
              )}
            </div>
            
            {callSettings.audioUrl && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Áudio configurado
              </p>
            )}
          </div>

          {/* Ringtone */}
          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary animate-pulse" />
              <h4 className="font-medium">Toque de Chamada</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Som que toca enquanto a "chamada" está entrando (MP4/MP3)
            </p>
            
            <Input
              value={callSettings.ringtoneUrl}
              onChange={(e) => setCallSettings(prev => ({ ...prev, ringtoneUrl: e.target.value }))}
              placeholder="URL do toque (MP4 ou MP3)"
              className="bg-secondary/50 font-mono text-xs"
            />
            
            <div className="flex gap-2">
              <input
                ref={ringtoneInputRef}
                type="file"
                accept="audio/*,video/mp4"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadAudio(file, 'ringtone');
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => ringtoneInputRef.current?.click()}
                disabled={isUploading}
                className="cursor-pointer"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
                Upload
              </Button>
            </div>
            
            {callSettings.ringtoneUrl && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Toque configurado
              </p>
            )}
          </div>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-400">
            <strong>Importante:</strong> O áudio deve estar em formato MP3 para máxima compatibilidade. 
            Tamanho recomendado: até 5MB para carregamento rápido.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <Button 
        type="button" 
        onClick={handleSave} 
        variant="gradient" 
        size="lg" 
        className="w-full cursor-pointer"
      >
        <Save className="w-5 h-5 mr-2" />
        Salvar Configurações de Pixel e Ligação
      </Button>
    </div>
  );
};

export default PixelAndCallSettings;
