import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileText, Upload, Download, Loader2, X, Eye, Sparkles, Target, Users, Zap, CheckCircle2, ShieldCheck, Palette, Package, ZoomIn, Maximize2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface PropostaEmpresaProps {
  onBack: () => void;
}

interface PropostaData {
  minhaEmpresa: string;
  empresaDestino: string;
  valorServico: string;
  incluirValor: boolean;
  incluirCriativos: boolean;
  quantidadeCriativos: string;
  corPrincipal: string;
  corSecundaria: string;
  logoUrl: string | null;
  fontSizeBase: number;
}

const defaultData: PropostaData = {
  minhaEmpresa: '',
  empresaDestino: '',
  valorServico: '497,00',
  incluirValor: true,
  incluirCriativos: false,
  quantidadeCriativos: '12',
  corPrincipal: '#00d4aa',
  corSecundaria: '#0f0f1a',
  logoUrl: null,
  fontSizeBase: 16,
};

export const PropostaEmpresa: React.FC<PropostaEmpresaProps> = ({ onBack }) => {
  const [data, setData] = useState<PropostaData>(defaultData);
  const [generating, setGenerating] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const update = (field: keyof PropostaData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  // Simplified drawIcon for canvas
  const drawCanvasIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.stroke();
  };

  const renderPreview = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 500;
    const H = 707;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Header Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 150);
    grad.addColorStop(0, data.corPrincipal);
    grad.addColorStop(1, data.corSecundaria);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 150);

    // Decorative circles
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for(let i=0; i<10; i++) {
      ctx.beginPath();
      ctx.arc(Math.random()*W, Math.random()*150, 5 + Math.random()*15, 0, Math.PI*2);
      ctx.fill();
    }

    // Logo
    if (logoPreview) {
      try {
        const img = new Image();
        img.src = logoPreview;
        await new Promise((resolve) => { img.onload = resolve; });
        const ratio = img.width / img.height;
        const h = 60;
        const w = h * ratio;
        ctx.drawImage(img, (W-w)/2, 170, w, h);
      } catch (e) {}
    }

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = data.corPrincipal;
    ctx.font = `bold ${data.fontSizeBase * 2.5}px Arial`;
    ctx.fillText('PROPOSTA ESTRATÉGICA', W/2, 280);

    ctx.fillStyle = '#333333';
    ctx.font = `bold ${data.fontSizeBase * 1.5}px Arial`;
    ctx.fillText(`PARA: ${data.empresaDestino.toUpperCase() || 'SUA EMPRESA'}`, W/2, 330);

    // Content Simulation
    ctx.textAlign = 'left';
    ctx.fillStyle = '#666666';
    ctx.font = `${data.fontSizeBase}px Arial`;
    const lines = [
      "Focamos 100% no público qualificado dos seus concorrentes.",
      "Aumente seu engajamento e vendas de forma orgânica.",
      "Garantia incondicional de 7 dias para sua segurança."
    ];
    lines.forEach((line, i) => {
      drawCanvasIcon(ctx, 60, 400 + i*40, data.corPrincipal);
      ctx.fillText(line, 80, 405 + i*40);
    });

    if (data.incluirValor) {
      ctx.fillStyle = data.corPrincipal;
      ctx.fillRect(50, 550, 200, 60);
      ctx.fillStyle = 'white';
      ctx.font = `bold ${data.fontSizeBase * 1.2}px Arial`;
      ctx.fillText(`R$ ${data.valorServico}`, 70, 590);
    }

    // Footer
    const footerGrad = ctx.createLinearGradient(0, H-60, 0, H);
    footerGrad.addColorStop(0, data.corPrincipal);
    footerGrad.addColorStop(1, data.corSecundaria);
    ctx.fillStyle = footerGrad;
    ctx.fillRect(0, H-60, W, 60);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = `bold ${data.fontSizeBase}px Arial`;
    ctx.fillText(data.minhaEmpresa.toUpperCase() || 'MINHA MARCA', W/2, H-25);
  };

  useEffect(() => {
    const timer = setTimeout(renderPreview, 100);
    return () => clearTimeout(timer);
  }, [data, logoPreview]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setData(prev => ({ ...prev, logoUrl: result }));
      setLogoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setData(prev => ({ ...prev, logoUrl: null }));
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const generatePDF = async () => {
    if (!data.minhaEmpresa || !data.empresaDestino) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 0;

      const rgb = hexToRgb(data.corPrincipal);
      const secondaryRgb = hexToRgb(data.corSecundaria);

      const drawGradientRect = (x: number, y: number, w: number, h: number) => {
        for (let i = 0; i < h; i++) {
          const ratio = i / h;
          const r = Math.floor(rgb.r * (1 - ratio) + secondaryRgb.r * ratio);
          const g = Math.floor(rgb.g * (1 - ratio) + secondaryRgb.g * ratio);
          const b = Math.floor(rgb.b * (1 - ratio) + secondaryRgb.b * ratio);
          doc.setFillColor(r, g, b);
          doc.rect(x, y + i, w, 1.2, 'F');
        }
      };

      const drawIcon = (x: number, y: number) => {
        doc.setDrawColor(rgb.r, rgb.g, rgb.b);
        doc.setLineWidth(0.5);
        doc.circle(x, y, 4, 'D');
        doc.line(x-2, y, x+2, y);
        doc.line(x, y-2, x, y+2);
      };

      // Page 1
      drawGradientRect(0, 0, pageWidth, 80);
      y = 100;
      if (data.logoUrl) {
        try {
          const img = new Image();
          img.src = data.logoUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          const ratio = img.width / img.height;
          const logoH = 30;
          const logoW = logoH * ratio;
          doc.addImage(data.logoUrl, 'PNG', (pageWidth - logoW) / 2, y, logoW, logoH);
          y += logoH + 20;
        } catch (e) {}
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(data.fontSizeBase * 2.2);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('PROPOSTA ESTRATÉGICA', pageWidth / 2, y, { align: 'center' });
      y += 15;
      doc.setFontSize(data.fontSizeBase * 1.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`EXCLUSIVA PARA: ${data.empresaDestino.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

      drawGradientRect(0, pageHeight - 30, pageWidth, 30);
      doc.setTextColor(255, 255, 255);
      doc.text(data.minhaEmpresa.toUpperCase(), pageWidth / 2, pageHeight - 12, { align: 'center' });

      // Page 2
      doc.addPage();
      drawGradientRect(0, 0, pageWidth, 20);
      y = 40;
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.setFontSize(data.fontSizeBase * 1.8);
      doc.text('NOSSA METODOLOGIA', margin, y);
      y += 15;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(data.fontSizeBase * 0.8);
      doc.setTextColor(50, 50, 50);
      const txt = "Não dependemos de anúncios caros. Focamos no público qualificado dos seus concorrentes, trazendo leads reais e engajados para o seu negócio diariamente.";
      const lines = doc.splitTextToSize(txt, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 7 + 10;

      [
        "Inteligência de Mercado: Mapeamento de perfis referência.",
        "Conexão Direta: Prospecção humana e personalizada.",
        "Segurança Total: Processos que respeitam as normas."
      ].forEach(item => {
        drawIcon(margin + 4, y - 1);
        doc.text(item, margin + 12, y);
        y += 10;
      });

      if (data.incluirValor) {
        y += 10;
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(margin, y, 80, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(`VALOR: R$ ${data.valorServico}`, margin + 5, y + 13);
      }

      const fileName = `Proposta_${data.empresaDestino.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      toast.success('Proposta gerada com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <header className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="font-bold">Gerador Premium</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Editor Sidebar */}
          <div className="space-y-6">
            <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Palette className="text-emerald-400" /> Identidade Visual</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor de Destaque</Label>
                  <div className="flex gap-2">
                    <input type="color" value={data.corPrincipal} onChange={e => update('corPrincipal', e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent" />
                    <Input value={data.corPrincipal} onChange={e => update('corPrincipal', e.target.value)} className="bg-white/5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor de Fundo (Degradê)</Label>
                  <div className="flex gap-2">
                    <input type="color" value={data.corSecundaria} onChange={e => update('corSecundaria', e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent" />
                    <Input value={data.corSecundaria} onChange={e => update('corSecundaria', e.target.value)} className="bg-white/5" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sua Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative group">
                      <img src={logoPreview} className="h-16 w-16 object-contain rounded bg-white/5" alt="Logo" />
                      <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"><X size={12} /></button>
                    </div>
                  ) : (
                    <button onClick={() => logoInputRef.current?.click()} className="h-16 w-16 rounded border-2 border-dashed border-white/10 flex items-center justify-center hover:border-emerald-500/50 transition-colors">
                      <Upload size={20} className="text-gray-500" />
                    </button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <p className="text-xs text-gray-500 italic">PNG ou JPG com fundo transparente recomendado.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Type size={16}/> Tamanho da Fonte Base</Label>
                <input type="range" min="12" max="24" step="1" value={data.fontSizeBase} onChange={e => update('fontSizeBase', parseInt(e.target.value))} className="w-full accent-emerald-500" />
                <div className="flex justify-between text-[10px] text-gray-500"><span>Pequeno</span><span>Padrão (16)</span><span>Grande</span></div>
              </div>
            </section>

            <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Target className="text-blue-400" /> Dados do Projeto</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sua Empresa / Marca</Label>
                  <Input value={data.minhaEmpresa} onChange={e => update('minhaEmpresa', e.target.value)} placeholder="Ex: Agência Resultados" className="bg-white/5" />
                </div>
                <div className="space-y-2">
                  <Label>Empresa do Cliente (Destino)</Label>
                  <Input value={data.empresaDestino} onChange={e => update('empresaDestino', e.target.value)} placeholder="Ex: Loja do João" className="bg-white/5" />
                </div>
              </div>
            </section>

            <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><Package className="text-purple-400" /> Oferta</h2>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <Label>Exibir Valor no PDF</Label>
                <Switch checked={data.incluirValor} onCheckedChange={v => update('incluirValor', v)} />
              </div>
              {data.incluirValor && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label>Valor do Serviço (R$)</Label>
                  <Input value={data.valorServico} onChange={e => update('valorServico', e.target.value)} placeholder="497,00" className="bg-white/5" />
                </div>
              )}
            </section>

            <Button onClick={generatePDF} disabled={generating} className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]">
              {generating ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Download className="w-6 h-6 mr-2" />}
              GERAR PROPOSTA AGORA
            </Button>
          </div>

          {/* Live Preview Column */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-white/[0.03] border border-white/10 p-2 rounded-3xl shadow-2xl overflow-hidden">
              <div className="bg-[#12121a] p-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Eye size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-400">Prévia do Documento</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500/20" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                  <div className="w-2 h-2 rounded-full bg-green-500/20" />
                </div>
              </div>
              <div className="p-4 bg-gray-900/50 backdrop-blur-sm">
                <canvas ref={canvasRef} className="w-full h-auto rounded-lg shadow-2xl border border-white/5 transition-opacity duration-300" />
              </div>
            </div>
            <p className="text-center text-xs text-gray-500 italic">
              A prévia acima é uma simulação visual. O PDF final será gerado em alta resolução.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};
