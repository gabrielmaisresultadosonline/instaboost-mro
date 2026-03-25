import React, { useState, useRef, useCallback } from 'react';
import { Download, Upload, CheckSquare, Square, Palette, Type, Image, Package, ChevronDown, ChevronUp, Eye, EyeOff, ThumbsDown, Rocket, Brain, DollarSign, Award, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface CreativeData {
  id: number;
  headline: string;
  highlightWord?: string;
  highlightColor?: string;
  text: string;
  cta: string;
  category: 'dor' | 'promessa' | 'educativo' | 'beneficio' | 'autoridade';
  icon: string;
}

const CREATIVES: CreativeData[] = [
  { id: 1, headline: "VOCÊ POSTA TODO DIA…\nE NÃO VENDE?", highlightWord: "NÃO VENDE", highlightColor: "#ef4444", text: "O problema não é o conteúdo.\nÉ que você está falando com as pessoas erradas.", cta: "👉 Descubra como atrair clientes reais", category: 'dor', icon: '🚫' },
  { id: 2, headline: "SEU CONCORRENTE ESTÁ\nPEGANDO SEUS CLIENTES", text: "E o pior… você está ajudando ele sem perceber.", cta: "👉 Aprenda a virar esse jogo", category: 'dor', icon: '⚔️' },
  { id: 3, headline: "CURTIDAS NÃO\nPAGAM BOLETOS", text: "Você precisa de clientes.\nNão de números vazios.", cta: "👉 Transforme engajamento em vendas", category: 'dor', icon: '👎' },
  { id: 4, headline: "SEU PERFIL\nESTÁ INVISÍVEL", text: "Quem realmente compra…\nnão está vendo você.", cta: "👉 Mude isso hoje", category: 'dor', icon: '👻' },
  { id: 5, headline: "VOCÊ NÃO PRECISA\nDE MAIS POSTS", text: "Você precisa da estratégia certa.", cta: "👉 Descubra qual é", category: 'dor', icon: '📱' },
  { id: 6, headline: "VOCÊ ESTÁ PERDENDO\nDINHEIRO", text: "Todos os dias…\npara seus concorrentes.", cta: "👉 Recupere seus clientes", category: 'dor', icon: '💸' },
  { id: 7, headline: "+1000 VISITAS\nNO SEU PERFIL", text: "Sem gastar 1 real com anúncios.", cta: "👉 Quero isso agora", category: 'promessa', icon: '🚀' },
  { id: 8, headline: "CLIENTES\nTODOS OS DIAS", text: "Sem depender de tráfego pago.", cta: "👉 Descubra como", category: 'promessa', icon: '📅' },
  { id: 9, headline: "ROUBAMOS A ATENÇÃO\nDO SEU CONCORRENTE", text: "E transformamos em vendas pra você.", cta: "👉 Veja como funciona", category: 'promessa', icon: '🎯' },
  { id: 10, headline: "PARE DE PAGAR\nPARA VENDER", text: "Existe um jeito mais inteligente.", cta: "👉 Conheça", category: 'promessa', icon: '🔌' },
  { id: 11, headline: "MAIS VENDAS.\nZERO ANÚNCIOS.", text: "Sim, é possível.", cta: "👉 Começar agora", category: 'promessa', icon: '✨' },
  { id: 12, headline: "CRESÇA SEM INVESTIR\nEM TRÁFEGO", text: "Estratégia > dinheiro", cta: "👉 Aplicar no meu negócio", category: 'promessa', icon: '🧠' },
  { id: 13, headline: "ANÚNCIOS NÃO SÃO\nO PROBLEMA", text: "Depender deles é.", cta: "👉 Entenda isso", category: 'educativo', icon: '💡' },
  { id: 14, headline: "O SEGREDO ESTÁ NO\nSEU CONCORRENTE", text: "O público já existe…\nvocê só precisa acessá-lo.", cta: "👉 Veja como fazemos", category: 'educativo', icon: '🔑' },
  { id: 15, headline: "VOCÊ NÃO PRECISA\nDE MAIS ALCANCE", text: "Precisa de público certo.", cta: "👉 Aprenda isso", category: 'educativo', icon: '🎯' },
  { id: 16, headline: "ENGAJAMENTO\nNÃO É SORTE", text: "É estratégia.", cta: "👉 Descubra a nossa", category: 'educativo', icon: '🎲' },
  { id: 17, headline: "SEGUIDORES NÃO\nPAGAM CONTAS", text: "Clientes sim.", cta: "👉 Foque no que importa", category: 'educativo', icon: '📊' },
  { id: 18, headline: "O ERRO QUE TRAVA\nSEU NEGÓCIO", text: "Falar com quem não compra.", cta: "👉 Corrigir isso", category: 'educativo', icon: '⚠️' },
  { id: 19, headline: "MAIS CLIENTES\nQUALIFICADOS", text: "Todos os dias no seu perfil.", cta: "👉 Quero isso", category: 'beneficio', icon: '👥' },
  { id: 20, headline: "VENDA MAIS\nGASTANDO MENOS", text: "Ou melhor… nada.", cta: "👉 Saiba como", category: 'beneficio', icon: '💰' },
  { id: 21, headline: "CRESCIMENTO\nPREVISÍVEL", text: "Sem depender de anúncios.", cta: "👉 Começar", category: 'beneficio', icon: '📈' },
  { id: 22, headline: "TRANSFORME VISITAS\nEM VENDAS", text: "Com público certo.", cta: "👉 Aplicar agora", category: 'beneficio', icon: '🔄' },
  { id: 23, headline: "MAIS ENGAJAMENTO\nREAL", text: "De quem realmente compra.", cta: "👉 Descubra", category: 'beneficio', icon: '❤️' },
  { id: 24, headline: "RESULTADOS\nSEM RISCO", text: "Sem investimento em ads.", cta: "👉 Quero testar", category: 'beneficio', icon: '🛡️' },
  { id: 25, headline: "EMPRESAS JÁ ESTÃO\nUSANDO ISSO", text: "E crescendo todos os dias.", cta: "👉 Veja como", category: 'autoridade', icon: '🏢' },
  { id: 26, headline: "+1.000 VISITAS\nEM POUCOS DIAS", text: "Sem anúncios.", cta: "👉 Entenda", category: 'autoridade', icon: '📊' },
  { id: 27, headline: "O MÉTODO QUE ESTÁ\nFUNCIONANDO EM 2026", text: "E poucos conhecem.", cta: "👉 Acessar", category: 'autoridade', icon: '🔥' },
  { id: 28, headline: "ENQUANTO VOCÊ\nPAGA ANÚNCIOS…", text: "Outros crescem de graça.", cta: "👉 Mude isso", category: 'autoridade', icon: '💡' },
  { id: 29, headline: "RESULTADOS\nREAIS", text: "Sem depender de tráfego pago.", cta: "👉 Aplicar", category: 'autoridade', icon: '✅' },
  { id: 30, headline: "VOCÊ ESTÁ\nATRASADO", text: "Se ainda depende de anúncios.", cta: "👉 Atualize sua estratégia", category: 'autoridade', icon: '⏰' },
];

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  dor: { label: '🔥 Criativos de Dor (1-6)', icon: <ThumbsDown size={16} /> },
  promessa: { label: '🚀 Criativos de Promessa (7-12)', icon: <Rocket size={16} /> },
  educativo: { label: '🧠 Educativos (13-18)', icon: <Brain size={16} /> },
  beneficio: { label: '💰 Benefícios (19-24)', icon: <DollarSign size={16} /> },
  autoridade: { label: '🔥 Prova / Autoridade (25-30)', icon: <Award size={16} /> },
};

const EstruturaRendaExtra = () => {
  const [bgColor1, setBgColor1] = useState('#1a1a2e');
  const [bgColor2, setBgColor2] = useState('#16213e');
  const [useGradient, setUseGradient] = useState(true);
  const [textColor, setTextColor] = useState('#ffffff');
  const [accentColor, setAccentColor] = useState('#00d4aa');
  const [ctaColor, setCtaColor] = useState('#facc15');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(true);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoUrl(ev.target?.result as string);
      toast.success('Logo carregada!');
    };
    reader.readAsDataURL(file);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === 30) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(CREATIVES.map(c => c.id)));
    }
  };

  const drawCreative = useCallback(async (creative: CreativeData, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    const W = 1080;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;

    // Background
    if (useGradient) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, bgColor1);
      grad.addColorStop(1, bgColor2);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = bgColor1;
    }
    ctx.fillRect(0, 0, W, H);

    // Decorative elements
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(W * 0.85, H * 0.15, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(W * 0.1, H * 0.85, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Top accent line
    const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
    lineGrad.addColorStop(0, accentColor);
    lineGrad.addColorStop(1, accentColor + '00');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, 0, W, 5);

    // Category badge
    const catLabel = creative.category.toUpperCase();
    ctx.font = 'bold 24px "Space Grotesk", Arial, sans-serif';
    ctx.fillStyle = accentColor;
    const badgeW = ctx.measureText(catLabel).width + 40;
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = accentColor;
    roundRect(ctx, 60, 60, badgeW, 44, 22);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 22px "Space Grotesk", Arial, sans-serif';
    ctx.fillText(catLabel, 80, 89);

    // Icon
    ctx.font = '80px Arial';
    ctx.fillText(creative.icon, W - 150, 110);

    // Number
    ctx.font = 'bold 180px "Space Grotesk", Arial, sans-serif';
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';
    ctx.fillText(String(creative.id).padStart(2, '0'), W - 60, 280);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    // Headline
    const headlineLines = creative.headline.split('\n');
    ctx.font = 'bold 72px "Space Grotesk", Arial, sans-serif';
    let y = 380;
    for (const line of headlineLines) {
      if (creative.highlightWord && line.includes(creative.highlightWord)) {
        const before = line.substring(0, line.indexOf(creative.highlightWord));
        const highlight = creative.highlightWord;
        const after = line.substring(line.indexOf(creative.highlightWord) + creative.highlightWord.length);
        let x = 80;
        if (before) {
          ctx.fillStyle = textColor;
          ctx.fillText(before, x, y);
          x += ctx.measureText(before).width;
        }
        ctx.fillStyle = creative.highlightColor || '#ef4444';
        ctx.fillText(highlight, x, y);
        x += ctx.measureText(highlight).width;
        if (after) {
          ctx.fillStyle = textColor;
          ctx.fillText(after, x, y);
        }
      } else {
        ctx.fillStyle = textColor;
        ctx.fillText(line, 80, y);
      }
      y += 90;
    }

    // Divider
    y += 30;
    const divGrad = ctx.createLinearGradient(80, y, 400, y);
    divGrad.addColorStop(0, accentColor);
    divGrad.addColorStop(1, accentColor + '00');
    ctx.fillStyle = divGrad;
    ctx.fillRect(80, y, 320, 4);
    y += 50;

    // Body text
    ctx.font = '38px "Inter", Arial, sans-serif';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.85;
    const bodyLines = creative.text.split('\n');
    for (const line of bodyLines) {
      ctx.fillText(line, 80, y);
      y += 55;
    }
    ctx.globalAlpha = 1;

    // CTA area
    const ctaY = H - 260;
    // CTA background
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = accentColor;
    roundRect(ctx, 60, ctaY, W - 120, 80, 16);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.font = 'bold 34px "Space Grotesk", Arial, sans-serif';
    ctx.fillStyle = ctaColor;
    ctx.fillText(creative.cta, 90, ctaY + 52);

    // Bottom accent line
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, H - 5, W, 5);

    // Logo
    if (logoUrl) {
      try {
        const img = await loadImage(logoUrl);
        const logoH = 80;
        const logoW = (img.width / img.height) * logoH;
        ctx.drawImage(img, W - logoW - 60, H - logoH - 60, logoW, logoH);
      } catch { /* skip */ }
    }

    // Watermark number
    ctx.font = 'bold 28px "Space Grotesk", Arial, sans-serif';
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.3;
    ctx.fillText(`#${String(creative.id).padStart(2, '0')}`, 80, H - 80);
    ctx.globalAlpha = 1;
  }, [bgColor1, bgColor2, useGradient, textColor, accentColor, ctaColor, logoUrl]);

  const downloadSingle = async (creative: CreativeData) => {
    const canvas = document.createElement('canvas');
    await drawCreative(creative, canvas);
    const link = document.createElement('a');
    link.download = `criativo-${String(creative.id).padStart(2, '0')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success(`Criativo ${creative.id} baixado!`);
  };

  const downloadSelected = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : CREATIVES.map(c => c.id);
    if (ids.length === 0) { toast.error('Selecione ao menos 1 criativo'); return; }
    setDownloading(true);
    try {
      const zip = new JSZip();
      const canvas = document.createElement('canvas');
      for (const id of ids) {
        const creative = CREATIVES.find(c => c.id === id)!;
        await drawCreative(creative, canvas);
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        zip.file(`criativo-${String(id).padStart(2, '0')}.png`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `criativos-rendaextra-${ids.length}un.zip`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`${ids.length} criativos baixados em ZIP!`);
    } catch { toast.error('Erro ao gerar ZIP'); }
    setDownloading(false);
  };

  const getPreviewBg = () => {
    if (useGradient) return `linear-gradient(180deg, ${bgColor1}, ${bgColor2})`;
    return bgColor1;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-lg md:text-xl font-bold font-['Space_Grotesk']">
            🎨 Gerador de Criativos
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={selectAll}>
              {selectedIds.size === 30 ? <CheckSquare size={16} /> : <Square size={16} />}
              <span className="hidden sm:inline ml-1">{selectedIds.size === 30 ? 'Desmarcar' : 'Selecionar'} Todos</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditorOpen(!editorOpen)}>
              <Palette size={16} />
              <span className="hidden sm:inline ml-1">Editor</span>
              {editorOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
            <Button size="sm" onClick={downloadSelected} disabled={downloading} className="bg-primary text-primary-foreground">
              <Package size={16} />
              <span className="ml-1">{downloading ? 'Gerando...' : `Baixar ${selectedIds.size > 0 ? selectedIds.size : 'Todos'} em ZIP`}</span>
            </Button>
          </div>
        </div>

        {/* Editor Panel */}
        {editorOpen && (
          <div className="border-t border-border bg-card/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fundo 1</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor1} onChange={e => setBgColor1(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <Input value={bgColor1} onChange={e => setBgColor1(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  Fundo 2
                  <button onClick={() => setUseGradient(!useGradient)} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                    {useGradient ? 'Degradê ON' : 'OFF'}
                  </button>
                </label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor2} onChange={e => setBgColor2(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" disabled={!useGradient} />
                  <Input value={bgColor2} onChange={e => setBgColor2(e.target.value)} className="h-8 text-xs" disabled={!useGradient} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cor Texto</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <Input value={textColor} onChange={e => setTextColor(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cor Destaque</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cor CTA</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={ctaColor} onChange={e => setCtaColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <Input value={ctaColor} onChange={e => setCtaColor(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Logo</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                {logoUrl ? (
                  <div className="flex items-center gap-1">
                    <img src={logoUrl} className="h-8 w-8 object-contain rounded" alt="logo" />
                    <button onClick={() => setLogoUrl(null)} className="text-destructive"><X size={14} /></button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 text-xs w-full" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} /> Upload
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Canvas hidden */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {(['dor', 'promessa', 'educativo', 'beneficio', 'autoridade'] as const).map(cat => (
          <div key={cat} className="mb-8">
            <h2 className="text-lg font-bold mb-4 font-['Space_Grotesk']">{CATEGORY_LABELS[cat].label}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {CREATIVES.filter(c => c.category === cat).map(creative => (
                <CreativeCard
                  key={creative.id}
                  creative={creative}
                  selected={selectedIds.has(creative.id)}
                  onToggle={() => toggleSelect(creative.id)}
                  onDownload={() => downloadSingle(creative)}
                  onPreview={() => setPreviewId(creative.id)}
                  bgStyle={getPreviewBg()}
                  textColor={textColor}
                  accentColor={accentColor}
                  ctaColor={ctaColor}
                  logoUrl={logoUrl}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewId && (
        <PreviewModal
          creative={CREATIVES.find(c => c.id === previewId)!}
          onClose={() => setPreviewId(null)}
          drawCreative={drawCreative}
          onDownload={() => downloadSingle(CREATIVES.find(c => c.id === previewId)!)}
        />
      )}
    </div>
  );
};

interface CreativeCardProps {
  creative: CreativeData;
  selected: boolean;
  onToggle: () => void;
  onDownload: () => void;
  onPreview: () => void;
  bgStyle: string;
  textColor: string;
  accentColor: string;
  ctaColor: string;
  logoUrl: string | null;
}

const CreativeCard: React.FC<CreativeCardProps> = ({ creative, selected, onToggle, onDownload, onPreview, bgStyle, textColor, accentColor, ctaColor, logoUrl }) => {
  const firstLine = creative.headline.split('\n')[0];
  return (
    <div className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selected ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-muted-foreground/30'}`}>
      {/* Mini preview */}
      <div
        className="aspect-[1080/1350] p-3 flex flex-col justify-between relative"
        style={{ background: bgStyle }}
        onClick={onPreview}
      >
        {/* Top */}
        <div>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: accentColor + '22', color: accentColor }}>
            {creative.category.toUpperCase()}
          </span>
          <div className="text-[10px] sm:text-xs font-bold mt-2 leading-tight" style={{ color: textColor }}>
            {firstLine}
          </div>
        </div>
        {/* Icon */}
        <div className="text-2xl text-center my-1">{creative.icon}</div>
        {/* Bottom */}
        <div>
          <div className="text-[7px] sm:text-[8px] leading-tight mb-1" style={{ color: textColor, opacity: 0.7 }}>{creative.text.split('\n')[0]}</div>
          <div className="text-[7px] sm:text-[8px] font-bold" style={{ color: ctaColor }}>{creative.cta}</div>
          {logoUrl && <img src={logoUrl} className="h-3 mt-1 object-contain" alt="" />}
        </div>
        {/* Number */}
        <div className="absolute top-1 right-2 text-[8px] font-bold" style={{ color: textColor, opacity: 0.2 }}>#{String(creative.id).padStart(2, '0')}</div>
      </div>
      {/* Actions */}
      <div className="absolute bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm flex items-center justify-between p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-1 rounded hover:bg-muted">
          {selected ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} className="text-muted-foreground" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onPreview(); }} className="p-1 rounded hover:bg-muted">
          <Eye size={14} className="text-muted-foreground" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="p-1 rounded hover:bg-muted">
          <Download size={14} className="text-muted-foreground" />
        </button>
      </div>
      {/* Select indicator */}
      {selected && (
        <div className="absolute top-1 left-1">
          <CheckSquare size={16} className="text-primary drop-shadow" />
        </div>
      )}
    </div>
  );
};

interface PreviewModalProps {
  creative: CreativeData;
  onClose: () => void;
  drawCreative: (c: CreativeData, canvas: HTMLCanvasElement) => Promise<void>;
  onDownload: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ creative, onClose, drawCreative, onDownload }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  React.useEffect(() => {
    if (canvasRef.current) {
      drawCreative(creative, canvasRef.current).then(() => setRendered(true));
    }
  }, [creative, drawCreative]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-md w-full" onClick={e => e.stopPropagation()}>
        <canvas ref={canvasRef} className="w-full rounded-xl shadow-2xl" />
        <div className="absolute top-3 right-3 flex gap-2">
          <Button size="sm" onClick={onDownload} className="bg-primary text-primary-foreground">
            <Download size={14} /> Baixar
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helpers
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default EstruturaRendaExtra;
