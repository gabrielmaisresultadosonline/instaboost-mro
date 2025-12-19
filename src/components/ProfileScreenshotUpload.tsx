import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, X, Check, Loader2, Image as ImageIcon, Clipboard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProfileScreenshotUploadProps {
  username: string;
  squarecloudUsername: string;
  existingScreenshotUrl?: string | null;
  onScreenshotUploaded: (url: string) => void;
  onAnalysisComplete?: (analysis: any) => void;
}

export const ProfileScreenshotUpload = ({
  username,
  squarecloudUsername,
  existingScreenshotUrl,
  onScreenshotUploaded,
  onAnalysisComplete
}: ProfileScreenshotUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingScreenshotUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Handle paste event for Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    toast.success('Imagem colada! Clique em "Enviar e Analisar"');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecione uma imagem primeiro');
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        // Upload to storage via edge function
        const { data, error } = await supabase.functions.invoke('upload-profile-screenshot', {
          body: {
            username,
            squarecloud_username: squarecloudUsername,
            image_base64: base64.split(',')[1], // Remove data:image/xxx;base64, prefix
            content_type: selectedFile.type
          }
        });

        if (error) throw error;

        if (data?.url) {
          setPreviewUrl(data.url);
          onScreenshotUploaded(data.url);
          setSelectedFile(null);
          toast.success('Print enviado com sucesso!');
          
          // Auto-start analysis after upload
          if (onAnalysisComplete) {
            setIsAnalyzing(true);
            try {
              const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-profile-screenshot', {
                body: {
                  screenshot_url: data.url,
                  username
                }
              });

              if (analysisError) throw analysisError;
              
              if (analysisData?.analysis) {
                onAnalysisComplete(analysisData.analysis);
                toast.success('Análise concluída!');
              }
            } catch (analysisErr) {
              console.error('Analysis error:', analysisErr);
              toast.error('Erro na análise. Tente novamente.');
            } finally {
              setIsAnalyzing(false);
            }
          }
        }
      };
      reader.readAsDataURL(selectedFile);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar print. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(existingScreenshotUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasExistingScreenshot = !!existingScreenshotUrl;
  const hasNewSelection = !!selectedFile;
  const showUploadButton = hasNewSelection && previewUrl !== existingScreenshotUrl;

  return (
    <Card className="glass-card glow-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          Print do Perfil
        </CardTitle>
        <CardDescription>
          {hasExistingScreenshot 
            ? 'Print atual do seu perfil. Você pode atualizar a qualquer momento.'
            : 'Suba um print do seu perfil do Instagram para análise completa.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview Area */}
        {previewUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img 
              src={previewUrl} 
              alt="Print do perfil" 
              className="w-full max-h-[400px] object-contain bg-muted"
            />
            {!isUploading && !isAnalyzing && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            {hasExistingScreenshot && !hasNewSelection && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-green-500/90 text-white px-2 py-1 rounded text-xs">
                <Check className="w-3 h-3" />
                Salvo
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              ref={dropZoneRef}
              tabIndex={0}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              onClick={(e) => {
                e.currentTarget.focus();
                toast.info('Área selecionada! Use Ctrl+V para colar a imagem');
              }}
            >
              <Clipboard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                Clique aqui e use <span className="text-primary font-medium">Ctrl+V</span> para colar
              </p>
              <p className="text-xs text-muted-foreground">
                Cole uma imagem da área de transferência
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Selecionar Imagem do Computador
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              PNG, JPG ou WEBP até 10MB
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="flex gap-2">

          {previewUrl && !hasNewSelection && (
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Trocar Imagem
            </Button>
          )}

          {showUploadButton && (
            <Button 
              onClick={handleUpload}
              disabled={isUploading || isAnalyzing}
              className="flex-1 bg-primary"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Enviar e Analisar
                </>
              )}
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">📸 Como tirar um bom print:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Abra seu perfil no Instagram</li>
            <li>Certifique-se que mostra seguidores, seguindo e posts</li>
            <li>Tire um print da tela inteira do perfil</li>
            <li>Nossa IA vai analisar todos os detalhes!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
