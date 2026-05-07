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
  periodoGarantia: string;
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
  periodoGarantia: '7',
};

export const PropostaEmpresa: React.FC<PropostaEmpresaProps> = ({ onBack }) => {
  const [data, setData] = useState<PropostaData>(defaultData);
  const [generating, setGenerating] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasPage2Ref = useRef<HTMLCanvasElement>(null);
  const canvasPage3Ref = useRef<HTMLCanvasElement>(null);
  const canvasPage4Ref = useRef<HTMLCanvasElement>(null);

  const update = (field: keyof PropostaData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const drawCanvasIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x - 1, y + 2);
    ctx.lineTo(x + 3, y - 2);
    ctx.stroke();
  };

  const renderPreview = async () => {
    if (!canvasRef.current || !canvasPage2Ref.current || !canvasPage3Ref.current || !canvasPage4Ref.current) return;
    
    const renderPage = async (canvas: HTMLCanvasElement, pageNum: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = 600;
      const H = 848; // A4 ratio
      canvas.width = W;
      canvas.height = H;

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      const headerGrad = ctx.createLinearGradient(0, 0, 0, pageNum === 1 ? 300 : 80);
      headerGrad.addColorStop(0, data.corPrincipal);
      headerGrad.addColorStop(1, data.corSecundaria);

      if (pageNum === 1) {
        ctx.fillStyle = headerGrad;
        ctx.fillRect(0, 0, W, 300);

        // Decorative Patterns
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for(let i=0; i<W; i+=30) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i+200, 300); ctx.stroke();
        }

        if (logoPreview) {
          try {
            const img = new Image();
            img.src = logoPreview;
            await new Promise((resolve) => { img.onload = resolve; });
            const ratio = img.width / img.height;
            const h = 80;
            const w = h * ratio;
            ctx.drawImage(img, (W-w)/2, 350, w, h);
          } catch (e) {}
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = data.corPrincipal;
        ctx.font = `bold ${data.fontSizeBase * 2.5}px Arial`;
        ctx.fillText('PROPOSTA ESTRATÉGICA', W/2, 500);

        ctx.fillStyle = '#1a1a1a';
        ctx.font = `bold ${data.fontSizeBase * 1.5}px Arial`;
        ctx.fillText(`EXCLUSIVA PARA: ${data.empresaDestino.toUpperCase() || 'SUA EMPRESA'}`, W/2, 560);

        const footerGrad = ctx.createLinearGradient(0, H-100, 0, H);
        footerGrad.addColorStop(0, data.corPrincipal);
        footerGrad.addColorStop(1, data.corSecundaria);
        ctx.fillStyle = footerGrad;
        ctx.fillRect(0, H-100, W, 100);
        ctx.fillStyle = 'white';
        ctx.font = `bold ${data.fontSizeBase * 1.2}px Arial`;
        ctx.fillText(data.minhaEmpresa.toUpperCase() || 'MINHA MARCA', W/2, H-40);

      } else {
        ctx.fillStyle = headerGrad;
        ctx.fillRect(0, 0, W, 80);
        ctx.textAlign = 'left';

        const wrapText = (text: string, x: number, y: number, maxWidth: number) => {
          const words = text.split(' ');
          let line = '';
          for(let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              ctx.fillText(line, x, y);
              line = words[n] + ' ';
              y += data.fontSizeBase * 1.5;
            } else { line = testLine; }
          }
          ctx.fillText(line, x, y);
          return y + data.fontSizeBase * 2;
        };

        if (pageNum === 2) {
          ctx.fillStyle = data.corPrincipal;
          ctx.font = `bold ${data.fontSizeBase * 1.8}px Arial`;
          ctx.fillText('O GRANDE PROBLEMA ATUAL', 50, 150);
          
          ctx.fillStyle = '#444444';
          ctx.font = `${data.fontSizeBase * 1.1}px Arial`;
          let y = wrapText("Hoje, a maioria das empresas desperdiça milhares de reais em anúncios que não convertem, ou pior, tentam vender para quem não tem interesse. O custo por cliente está cada vez mais alto e a atenção das pessoas cada vez menor.", 50, 200, 500);

          ctx.fillStyle = data.corPrincipal;
          ctx.font = `bold ${data.fontSizeBase * 1.5}px Arial`;
          ctx.fillText('NOSSA SOLUÇÃO EXCLUSIVA', 50, y);
          y += 40;

          ctx.fillStyle = '#444444';
          ctx.font = `${data.fontSizeBase * 1.1}px Arial`;
          y = wrapText("Nós não vamos 'tentar' achar seu público. Nós vamos buscá-lo onde ele já está: nos seus concorrentes. Atraímos a audiência que já consome produtos similares ao seu, mas entregamos uma oferta impossível de ignorar.", 50, y, 500);
        } else if (pageNum === 3) {
          ctx.fillStyle = data.corPrincipal;
          ctx.font = `bold ${data.fontSizeBase * 1.8}px Arial`;
          ctx.fillText('METODOLOGIA EM 3 PASSOS', 50, 150);

          let y = 220;
          [
            { t: "1. Mapeamento de Concorrentes", d: "Identificamos quem são os players que já possuem seu público." },
            { t: "2. Extração e Atração", d: "Utilizamos ferramentas para atrair essa audiência de forma orgânica." },
            { t: "3. Conversão Direta", d: "Transformamos seguidores e curiosos em clientes pagantes." }
          ].forEach((item) => {
            drawCanvasIcon(ctx, 60, y, data.corPrincipal);
            ctx.fillStyle = '#1a1a1a';
            ctx.font = `bold ${data.fontSizeBase * 1.1}px Arial`;
            ctx.fillText(item.t, 80, y + 5);
            y += 25;
            ctx.fillStyle = '#666666';
            ctx.font = `${data.fontSizeBase * 0.9}px Arial`;
            y = wrapText(item.d, 80, y, 450);
            y += 10;
          });
        } else if (pageNum === 4) {
          ctx.fillStyle = data.corPrincipal;
          ctx.font = `bold ${data.fontSizeBase * 1.8}px Arial`;
          ctx.fillText('INVESTIMENTO E GARANTIA', 50, 150);

          let y = 200;
          if (data.incluirValor) {
            ctx.fillStyle = data.corPrincipal;
            ctx.beginPath();
            ctx.roundRect(50, y, 500, 120, 15);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${data.fontSizeBase * 1.6}px Arial`;
            ctx.fillText(`PLANO DE 30 DIAS: R$ ${data.valorServico}`, 80, y + 50);
            ctx.font = `${data.fontSizeBase * 0.9}px Arial`;
            ctx.fillText("INVESTIMENTO MENSAL PARA RESULTADOS ESCALÁVEIS", 80, y + 85);
            y += 160;
          }

          ctx.fillStyle = '#1a1a1a';
          ctx.font = `bold ${data.fontSizeBase * 1.3}px Arial`;
          ctx.fillText(`RISCO ZERO: ${data.periodoGarantia} DIAS DE GARANTIA`, 50, y);
          y += 30;
          ctx.fillStyle = '#666666';
          ctx.font = `${data.fontSizeBase * 1}px Arial`;
          wrapText("Se em até 7 dias você não estiver satisfeito com a qualidade da audiência e o início dos trabalhos, devolvemos seu investimento integralmente.", 50, y, 500);
        }
      }
    };

    await renderPage(canvasRef.current, 1);
    await renderPage(canvasPage2Ref.current, 2);
    await renderPage(canvasPage3Ref.current, 3);
    await renderPage(canvasPage4Ref.current, 4);
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
      
      const rgb = hexToRgb(data.corPrincipal);
      const secondaryRgb = hexToRgb(data.corSecundaria);

      const drawGradientRect = (x: number, y: number, w: number, h: number) => {
        for (let i = 0; i < h; i += 0.5) {
          const ratio = i / h;
          const r = Math.floor(rgb.r * (1 - ratio) + secondaryRgb.r * ratio);
          const g = Math.floor(rgb.g * (1 - ratio) + secondaryRgb.g * ratio);
          const b = Math.floor(rgb.b * (1 - ratio) + secondaryRgb.b * ratio);
          doc.setFillColor(r, g, b);
          doc.rect(x, y + i, w, 0.6, 'F');
        }
      };

      const drawIcon = (x: number, y: number) => {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.circle(x, y, 3, 'F');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.4);
        doc.line(x-1.5, y, x-0.5, y+1);
        doc.line(x-0.5, y+1, x+1.5, y-1);
      };

      // PAGE 1: COVER
      drawGradientRect(0, 0, pageWidth, 90);
      doc.setDrawColor(255, 255, 255, 0.1);
      for(let i=0; i<pageWidth; i+=10) doc.line(i, 0, i+20, 90);

      let yPos = 110;
      if (data.logoUrl) {
        try {
          const img = new Image();
          img.src = data.logoUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          const ratio = img.width / img.height;
          const logoH = 35;
          const logoW = logoH * ratio;
          doc.addImage(data.logoUrl, 'PNG', (pageWidth - logoW) / 2, yPos, logoW, logoH);
          yPos += logoH + 25;
        } catch (e) {}
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(data.fontSizeBase * 2.2);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('PROPOSTA ESTRATÉGICA', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      doc.setFontSize(data.fontSizeBase * 1.5);
      doc.setTextColor(30, 30, 30);
      doc.text(`EXCLUSIVA PARA: ${data.empresaDestino.toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });

      drawGradientRect(0, pageHeight - 35, pageWidth, 35);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(data.fontSizeBase * 1.2);
      doc.text(data.minhaEmpresa.toUpperCase(), pageWidth / 2, pageHeight - 15, { align: 'center' });

      // PAGE 2: THE PROBLEM & VISION
      doc.addPage();
      drawGradientRect(0, 0, pageWidth, 25);
      yPos = 45;
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.setFontSize(data.fontSizeBase * 1.8);
      doc.setFont('helvetica', 'bold');
      doc.text('O DESAFIO DO MERCADO ATUAL', margin, yPos);
      yPos += 15;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(data.fontSizeBase * 1);
      doc.setTextColor(60, 60, 60);
      const probText = "Atualmente, a maioria das empresas enfrenta o mesmo obstáculo: o alto custo de aquisição de clientes através de anúncios pagos. O mercado está saturado e a atenção do público está cada vez mais cara.";
      const probLines = doc.splitTextToSize(probText, contentWidth);
      doc.text(probLines, margin, yPos);
      yPos += probLines.length * 7 + 15;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('NOSSA ABORDAGEM DISRUPTIVA', margin, yPos);
      yPos += 10;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const solText = "Em vez de lutar por atenção aleatória, nós focamos no seu 'Público Alvo 3x Mais Assertivo'. Isso significa atrair pessoas que já demonstram interesse real em produtos como o seu, capturando a audiência qualificada dos seus concorrentes de forma ética e estratégica.";
      const solLines = doc.splitTextToSize(solText, contentWidth);
      doc.text(solLines, margin, yPos);

      // PAGE 3: METHODOLOGY
      doc.addPage();
      drawGradientRect(0, 0, pageWidth, 25);
      yPos = 45;
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.setFontSize(data.fontSizeBase * 1.8);
      doc.setFont('helvetica', 'bold');
      doc.text('METODOLOGIA DE RESULTADOS', margin, yPos);
      yPos += 20;

      const steps = [
        { t: "1. MAPEAMENTO E INTELIGÊNCIA", d: "Identificamos os perfis e canais onde seus potenciais clientes estão ativos agora. Analisamos o comportamento de compra e engajamento." },
        { t: "2. EXTRAÇÃO E ATRAÇÃO ORGÂNICA", d: "Implementamos nossa tecnologia para atrair esses usuários qualificados para sua marca, sem depender de orçamentos crescentes em anúncios." },
        { t: "3. ESCALABILIDADE DE VENDAS", d: "Criamos um fluxo constante de novos interessados chegando diariamente, permitindo que seu time foque apenas em fechar novos negócios." }
      ];

      steps.forEach(step => {
        drawIcon(margin + 3, yPos - 1);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(data.fontSizeBase * 1);
        doc.setTextColor(30, 30, 30);
        doc.text(step.t, margin + 10, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(data.fontSizeBase * 0.9);
        doc.setTextColor(70, 70, 70);
        const dLines = doc.splitTextToSize(step.d, contentWidth - 15);
        doc.text(dLines, margin + 10, yPos);
        yPos += dLines.length * 6 + 12;
      });

      // PAGE 4: INVESTMENT & GUARANTEE
      doc.addPage();
      drawGradientRect(0, 0, pageWidth, 25);
      yPos = 45;
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.setFontSize(data.fontSizeBase * 1.8);
      doc.setFont('helvetica', 'bold');
      doc.text('INVESTIMENTO E PARCERIA', margin, yPos);
      yPos += 20;

      if (data.incluirValor) {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.roundedRect(margin, yPos, 140, 35, 4, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(data.fontSizeBase * 1.4);
        doc.text(`VALOR MENSAL: R$ ${data.valorServico}`, margin + 10, yPos + 13);
        doc.setFontSize(data.fontSizeBase * 0.8);
        doc.text("PLANO DE ACELERAÇÃO PARA 30 DIAS", margin + 10, yPos + 25);
        yPos += 55;
      }

      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.setFontSize(data.fontSizeBase * 1.4);
      doc.text(`GARANTIA DE SATISFAÇÃO: ${data.periodoGarantia} DIAS`, margin, yPos);
      yPos += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(data.fontSizeBase * 1);
      doc.setTextColor(60, 60, 60);
      const garText = `Acreditamos tanto em nossa metodologia que oferecemos ${data.periodoGarantia} dias de garantia. Se não ver o potencial de escala logo na primeira semana, devolvemos seu investimento sem burocracia.`;
      const garLines = doc.splitTextToSize(garText, contentWidth);
      doc.text(garLines, margin, yPos);
      
      yPos += garLines.length * 7 + 40;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(data.fontSizeBase * 1.6);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text("VAMOS COMEÇAR HOJE?", pageWidth / 2, yPos, { align: 'center' });

      const fileName = `Proposta_${data.empresaDestino.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
      toast.success('Proposta gerada com sucesso!');
    } catch (err) {
      console.error(err);
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
              <h2 className="text-xl font-bold flex items-center gap-2"><Package className="text-purple-400" /> Oferta & Valor</h2>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="space-y-0.5">
                    <Label>Exibir Valor no PDF</Label>
                    <p className="text-[10px] text-gray-500">Ocultar se for negociar depois</p>
                  </div>
                  <Switch checked={data.incluirValor} onCheckedChange={v => update('incluirValor', v)} />
                </div>

                {data.incluirValor && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label>Valor do Serviço (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                      <Input value={data.valorServico} onChange={e => update('valorServico', e.target.value)} placeholder="497,00" className="bg-white/5 pl-10" />
                    </div>
                    <p className="text-[10px] text-emerald-500/80 italic font-medium">O PDF informará que este é um valor mensal para 30 dias.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Dias de Garantia</Label>
                  <Input value={data.periodoGarantia} onChange={e => update('periodoGarantia', e.target.value)} placeholder="7" className="bg-white/5" />
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3">
              <Button onClick={generatePDF} disabled={generating} className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xl rounded-2xl shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] group">
                {generating ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Download className="w-6 h-6 mr-2 group-hover:bounce" />}
                GERAR PDF PROFISSIONAL
              </Button>
              
              <Button variant="outline" onClick={() => setShowFullPreview(true)} className="lg:hidden w-full h-12 bg-white/5 border-white/10 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-white/10">
                <Maximize2 size={18} className="text-emerald-400" />
                Ver Prévia Completa
              </Button>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="bg-white/[0.03] border border-white/10 p-1.5 rounded-[2rem] shadow-2xl overflow-hidden group">
              <div className="bg-[#12121a] p-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                    <Eye size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block leading-none">Prévia em Tempo Real</span>
                    <span className="text-[10px] text-gray-500">2 páginas configuradas</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowFullPreview(true)} className="text-gray-400 hover:text-white gap-1 text-xs">
                  <Maximize2 size={14} />
                  Expandir
                </Button>
              </div>

              <div className="p-6 bg-gray-900/50 backdrop-blur-sm space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="space-y-8">
                  <div className="relative group/page">
                    <canvas ref={canvasRef} className="w-full h-auto rounded-lg shadow-2xl border border-white/5 transition-all duration-300" />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white opacity-0 group-hover/page:opacity-100 transition-opacity">PÁGINA 1</div>
                  </div>
                  <div className="relative group/page">
                    <canvas ref={canvasPage2Ref} className="w-full h-auto rounded-lg shadow-2xl border border-white/5 transition-all duration-300" />
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white opacity-0 group-hover/page:opacity-100 transition-opacity">PÁGINA 2</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
              <ShieldCheck className="text-emerald-400 w-8 h-8 shrink-0" />
              <p className="text-[11px] text-emerald-100/70 leading-relaxed">
                <strong className="text-emerald-400 block mb-0.5">Design de Alta Conversão</strong>
                Sua proposta utiliza gatilhos mentais e uma estrutura visual validada para fechar contratos de alto valor.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Full Preview Modal */}
      {showFullPreview && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <button onClick={() => setShowFullPreview(false)} className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50">
            <X size={24} />
          </button>
          
          <div className="w-full max-w-4xl h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
            <div className="text-center space-y-2 pt-10">
              <h3 className="text-2xl font-bold text-white">Visualização Completa</h3>
              <p className="text-gray-400">Arraste para ver as páginas da sua proposta estratégica</p>
            </div>
            
            <div className="space-y-12 pb-20 flex flex-col items-center">
              <div className="w-full max-w-[600px] bg-white rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
                <canvas 
                  width={600} 
                  height={848} 
                  style={{ width: '100%', height: 'auto' }}
                  ref={(el) => {
                    if (el && canvasRef.current) {
                      const ctx = el.getContext('2d');
                      if (ctx) ctx.drawImage(canvasRef.current, 0, 0);
                    }
                  }} 
                />
              </div>
              <div className="w-full max-w-[600px] bg-white rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
                <canvas 
                  width={600} 
                  height={848} 
                  style={{ width: '100%', height: 'auto' }}
                  ref={(el) => {
                    if (el && canvasPage2Ref.current) {
                      const ctx = el.getContext('2d');
                      if (ctx) ctx.drawImage(canvasPage2Ref.current, 0, 0);
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};
