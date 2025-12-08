import { useState, useRef } from 'react';
import { Strategy, Creative, InstagramProfile, CreativeConfig, CreativeColors } from '@/types/instagram';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Download, Sparkles, Image as ImageIcon, Upload, X, Palette } from 'lucide-react';
import { generateCreative } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CreativeGeneratorProps {
  strategy: Strategy;
  profile: InstagramProfile;
  niche: string;
  onCreativeGenerated: (creative: Creative) => void;
  onClose: () => void;
}

const COLOR_PRESETS: { name: string; colors: CreativeColors }[] = [
  { name: 'Azul Profissional', colors: { primary: '#1e40af', secondary: '#3b82f6', text: '#ffffff' } },
  { name: 'Verde Natureza', colors: { primary: '#166534', secondary: '#22c55e', text: '#ffffff' } },
  { name: 'Roxo Criativo', colors: { primary: '#7c3aed', secondary: '#a78bfa', text: '#ffffff' } },
  { name: 'Laranja Energia', colors: { primary: '#ea580c', secondary: '#fb923c', text: '#ffffff' } },
  { name: 'Rosa Moderno', colors: { primary: '#db2777', secondary: '#f472b6', text: '#ffffff' } },
  { name: 'Preto Elegante', colors: { primary: '#18181b', secondary: '#3f3f46', text: '#ffffff' } },
  { name: 'Dourado Premium', colors: { primary: '#b45309', secondary: '#fbbf24', text: '#ffffff' } },
  { name: 'Vermelho Impacto', colors: { primary: '#dc2626', secondary: '#f87171', text: '#ffffff' } },
];

export const CreativeGenerator = ({ strategy, profile, niche, onCreativeGenerated, onClose }: CreativeGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCreative, setGeneratedCreative] = useState<Creative | null>(null);
  const [step, setStep] = useState<'config' | 'generating' | 'result'>('config');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration state
  const [config, setConfig] = useState<CreativeConfig>({
    colors: COLOR_PRESETS[0].colors,
    logoType: 'profile',
    businessType: niche || 'marketing digital',
  });
  const [customLogoPreview, setCustomLogoPreview] = useState<string | null>(null);

  const handleColorSelect = (colors: CreativeColors) => {
    setConfig(prev => ({ ...prev, colors }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCustomLogoPreview(base64);
        setConfig(prev => ({ ...prev, logoType: 'custom', customLogoUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const clearCustomLogo = () => {
    setCustomLogoPreview(null);
    setConfig(prev => ({ ...prev, logoType: 'profile', customLogoUrl: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateCreative = async () => {
    setIsGenerating(true);
    setStep('generating');
    
    toast({
      title: "Gerando criativo com IA...",
      description: "Criando imagem personalizada com sua marca",
    });

    try {
      // Determine which logo URL to use
      let logoUrl: string | undefined;
      if (config.logoType === 'profile') {
        logoUrl = profile.profilePicUrl;
      } else if (config.logoType === 'custom' && config.customLogoUrl) {
        logoUrl = config.customLogoUrl;
      }

      const result = await generateCreative(strategy, profile, niche, config, logoUrl);

      if (result.success && result.creative) {
        // Add config data to the creative
        result.creative.colors = config.colors;
        result.creative.logoUrl = logoUrl;
        result.creative.downloaded = false;
        
        setGeneratedCreative(result.creative);
        setStep('result');
        toast({
          title: "Criativo gerado! 🎨",
          description: "Imagem e textos prontos para uso",
        });
      } else {
        setStep('config');
        toast({
          title: "Erro ao gerar criativo",
          description: result.error || "Tente novamente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setStep('config');
      toast({
        title: "Erro",
        description: "Não foi possível gerar o criativo",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveCreative = () => {
    if (generatedCreative) {
      onCreativeGenerated(generatedCreative);
      toast({
        title: "Criativo salvo!",
        description: "Disponível na galeria por 1 mês. Após download, conta como usado.",
      });
    }
  };

  const downloadImage = () => {
    if (generatedCreative?.imageUrl) {
      window.open(generatedCreative.imageUrl, '_blank');
      toast({
        title: "Download iniciado",
        description: "Criativo marcado como usado",
      });
    }
  };

  const getLogoPreview = () => {
    if (config.logoType === 'custom' && customLogoPreview) {
      return customLogoPreview;
    }
    if (config.logoType === 'profile') {
      return profile.profilePicUrl;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass-card glow-border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Gerar Criativo com IA
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strategy Info */}
        <div className="p-4 rounded-lg bg-secondary/50 mb-6">
          <p className="text-sm text-muted-foreground mb-1">Baseado na estratégia:</p>
          <p className="font-semibold">{strategy.title}</p>
        </div>

        {/* Step 1: Configuration */}
        {step === 'config' && (
          <div className="space-y-6">
            {/* Business Type */}
            <div className="space-y-2">
              <Label htmlFor="businessType" className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Tipo de Negócio / Tema do Fundo
              </Label>
              <Input
                id="businessType"
                value={config.businessType}
                onChange={(e) => setConfig(prev => ({ ...prev, businessType: e.target.value }))}
                placeholder="Ex: agência de marketing digital, loja de roupas..."
                className="bg-secondary/50"
              />
              <p className="text-xs text-muted-foreground">
                Será usado para gerar um fundo contextualizado
              </p>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Cores do Criativo
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleColorSelect(preset.colors)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      config.colors.primary === preset.colors.primary
                        ? 'border-primary ring-2 ring-primary/50'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      <div 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: preset.colors.primary }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full" 
                        style={{ backgroundColor: preset.colors.secondary }}
                      />
                    </div>
                    <span className="text-xs">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Logo do Criativo
              </Label>
              
              <div className="grid grid-cols-3 gap-3">
                {/* Profile Logo Option */}
                <button
                  onClick={() => setConfig(prev => ({ ...prev, logoType: 'profile' }))}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                    config.logoType === 'profile'
                      ? 'border-primary ring-2 ring-primary/50 bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img 
                    src={profile.profilePicUrl} 
                    alt="Profile" 
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`;
                    }}
                  />
                  <span className="text-xs text-center">Logo do Instagram</span>
                </button>

                {/* Custom Logo Option */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                    config.logoType === 'custom'
                      ? 'border-primary ring-2 ring-primary/50 bg-primary/10'
                      : 'border-border hover:border-primary/50 border-dashed'
                  }`}
                >
                  {customLogoPreview ? (
                    <>
                      <div className="relative">
                        <img 
                          src={customLogoPreview} 
                          alt="Custom" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <button 
                          onClick={(e) => { e.stopPropagation(); clearCustomLogo(); }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-destructive-foreground" />
                        </button>
                      </div>
                      <span className="text-xs text-center">Logo Customizada</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <span className="text-xs text-center">Fazer Upload</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                {/* No Logo Option */}
                <button
                  onClick={() => setConfig(prev => ({ ...prev, logoType: 'none' }))}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                    config.logoType === 'none'
                      ? 'border-primary ring-2 ring-primary/50 bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-center">Sem Logo</span>
                </button>
              </div>
            </div>

            {/* Preview Area */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border">
              <p className="text-sm font-medium mb-3">Pré-visualização do Prompt:</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>🎨 <strong>Fundo:</strong> {config.businessType}</p>
                <p>🎯 <strong>Cores:</strong> {COLOR_PRESETS.find(p => p.colors.primary === config.colors.primary)?.name || 'Personalizada'}</p>
                <p>📌 <strong>Logo:</strong> {
                  config.logoType === 'profile' ? 'Do Instagram' :
                  config.logoType === 'custom' ? 'Customizada' : 'Sem logo'
                }</p>
                <p>💬 <strong>CTA:</strong> Gerado pela IA com base na estratégia</p>
              </div>
            </div>

            <Button 
              onClick={handleGenerateCreative} 
              variant="gradient" 
              size="lg" 
              className="w-full"
            >
              <Sparkles className="w-5 h-5" />
              Gerar Criativo com IA
            </Button>
          </div>
        )}

        {/* Step 2: Generating */}
        {step === 'generating' && (
          <div className="space-y-4">
            <div className="aspect-square rounded-lg bg-secondary/50 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary" />
              <p className="text-sm">Gerando criativo com Gemini AI...</p>
              <p className="text-xs mt-2 text-muted-foreground">Isso pode levar alguns segundos</p>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && generatedCreative && (
          <div className="space-y-4">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
              <img 
                src={generatedCreative.imageUrl} 
                alt="Criativo gerado" 
                className="w-full h-full object-cover"
              />
              {/* Overlay with text */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent flex flex-col justify-end p-6">
                {/* Logo at top */}
                {getLogoPreview() && (
                  <div className="absolute top-4 left-4">
                    <img 
                      src={getLogoPreview()!} 
                      alt="Logo" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                    />
                  </div>
                )}
                
                <h4 className="text-2xl font-display font-bold text-center mb-2 text-gradient">
                  {generatedCreative.headline}
                </h4>
                <span 
                  className="mx-auto px-6 py-3 rounded-full font-semibold"
                  style={{ 
                    backgroundColor: config.colors.primary, 
                    color: config.colors.text 
                  }}
                >
                  {generatedCreative.ctaText}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={() => { setStep('config'); setGeneratedCreative(null); }} 
                variant="outline" 
                className="flex-1"
              >
                <Sparkles className="w-4 h-4" />
                Gerar Outro
              </Button>
              <Button onClick={downloadImage} variant="outline" className="flex-1">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
            <Button onClick={saveCreative} variant="gradient" className="w-full">
              <Download className="w-4 h-4" />
              Salvar Criativo
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              ⏰ Criativos salvos ficam disponíveis por 1 mês. Após download, conta como usado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
