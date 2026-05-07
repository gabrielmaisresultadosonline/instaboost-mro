import React, { useState, useRef } from 'react';
import { ArrowLeft, FileText, Upload, Download, Loader2, X, Eye, Sparkles, Target, Users, Zap, CheckCircle2, ShieldCheck, Palette, Package } from 'lucide-react';
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
};

export const PropostaEmpresa: React.FC<PropostaEmpresaProps> = ({ onBack }) => {
  const [data, setData] = useState<PropostaData>(defaultData);
  const [generating, setGenerating] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof PropostaData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

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

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  const generatePDF = async () => {
    if (!data.minhaEmpresa || !data.empresaDestino) {
      toast.error('Preencha o nome da sua empresa e da empresa destino');
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

      // Helper functions for modern look
      const drawGradientRect = (x: number, y: number, w: number, h: number) => {
        for (let i = 0; i < h; i++) {
          const ratio = i / h;
          const r = Math.floor(rgb.r * (1 - ratio) + secondaryRgb.r * ratio);
          const g = Math.floor(rgb.g * (1 - ratio) + secondaryRgb.g * ratio);
          const b = Math.floor(rgb.b * (1 - ratio) + secondaryRgb.b * ratio);
          doc.setFillColor(r, g, b);
          doc.rect(x, y + i, w, 1.2, 'F'); // Using 1.2 to avoid thin white lines
        }
      };

      const drawIcon = (x: number, y: number, type: 'target' | 'zap' | 'shield' | 'users' | 'chart') => {
        doc.setDrawColor(rgb.r, rgb.g, rgb.b);
        doc.setLineWidth(0.5);
        doc.setFillColor(rgb.r, rgb.g, rgb.b, 0.1);
        doc.circle(x, y, 5, 'FD');
        
        doc.setDrawColor(rgb.r, rgb.g, rgb.b);
        doc.setLineWidth(0.3);
        if (type === 'target') {
          doc.circle(x, y, 2.5, 'D');
          doc.line(x - 4, y, x + 4, y);
          doc.line(x, y - 4, x, y + 4);
        } else if (type === 'zap') {
          doc.line(x - 1, y - 3, x + 2, y);
          doc.line(x + 2, y, x - 2, y);
          doc.line(x - 2, y, x + 1, y + 3);
        } else if (type === 'shield') {
          doc.line(x - 2, y - 2, x + 2, y - 2);
          doc.line(x + 2, y - 2, x + 2, y + 1);
          doc.line(x + 2, y + 1, x, y + 3);
          doc.line(x, y + 3, x - 2, y + 1);
          doc.line(x - 2, y + 1, x - 2, y - 2);
        } else if (type === 'users') {
          doc.circle(x - 1.5, y - 1, 1.5, 'D');
          doc.circle(x + 1.5, y - 1, 1.5, 'D');
        } else if (type === 'chart') {
          doc.line(x - 2.5, y + 2, x - 2.5, y);
          doc.line(x, y + 2, x, y - 2);
          doc.line(x + 2.5, y + 2, x + 2.5, y - 1);
        }
      };

      // --- CAPA ---
      // Background Gradient
      drawGradientRect(0, 0, pageWidth, 80);
      
      // Decorative Vectors on Cover
      doc.setDrawColor(255, 255, 255, 0.1);
      for(let i=0; i<15; i++) {
        doc.circle(10 + i*15, 40 + (i%4)*8, 2 + (i%3), 'D');
        doc.line(0, i*10, pageWidth, i*5);
      }

      y = 80;
      // Logo
      if (data.logoUrl) {
        try {
          const img = new Image();
          img.src = data.logoUrl;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          const ratio = img.width / img.height;
          const logoH = 30;
          const logoW = logoH * ratio;
          doc.addImage(data.logoUrl, 'PNG', (pageWidth - logoW) / 2, y, logoW, logoH);
          y += logoH + 25;
        } catch {
          y += 15;
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(36);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('PROPOSTA', pageWidth / 2, y, { align: 'center' });
      y += 12;
      doc.text('ESTRATÉGICA', pageWidth / 2, y, { align: 'center' });
      
      y += 16;
      doc.setFontSize(22);
      doc.setTextColor(60, 60, 60);
      doc.text(`EXCLUSIVA PARA: ${data.empresaDestino.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

      y += 45;
      doc.setFontSize(16);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('Vendas e Engajamento de Alta Performance', pageWidth / 2, y, { align: 'center' });
      
      y += 10;
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text('A estratégia definitiva para dominar o mercado orgânico.', pageWidth / 2, y, { align: 'center' });

      // Footer Cover Gradient
      drawGradientRect(0, pageHeight - 35, pageWidth, 35);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(data.minhaEmpresa.toUpperCase(), pageWidth / 2, pageHeight - 16, { align: 'center' });

      // --- PAGINA 2: O CENÁRIO ---
      doc.addPage();
      y = 35;

      // Top Bar Gradient
      drawGradientRect(0, 0, pageWidth, 20);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      drawIcon(margin + 5, y - 2, 'chart');
      doc.text('O Cenário Atual', margin + 15, y);
      y += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      const introText = `Atualmente, o mercado digital está saturado de anúncios caros e ineficientes. Muitas empresas "queimam dinheiro" tentando atrair a atenção de pessoas que não têm o perfil ideal de compra. O custo por clique sobe, enquanto a conversão cai.`;
      const introLines = doc.splitTextToSize(introText, contentWidth);
      doc.text(introLines, margin, y);
      y += introLines.length * 6 + 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      drawIcon(margin + 5, y - 2, 'zap');
      doc.text('Nossa Metodologia Disruptiva', margin + 15, y);
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      const methodText = `Não dependemos da sorte ou de algoritmos de anúncios. Nossa estratégia é cirúrgica: focamos 100% no público qualificado dos seus concorrentes. Nós acessamos a audiência que já consome o seu nicho e a trazemos para o seu ecossistema de forma humana, orgânica e altamente persuasiva.`;
      const methodLines = doc.splitTextToSize(methodText, contentWidth);
      doc.text(methodLines, margin, y);
      y += methodLines.length * 6 + 20;

      // Modern Info Box
      doc.setFillColor(rgb.r, rgb.g, rgb.b, 0.08);
      doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      doc.setLineWidth(0.1);
      doc.roundedRect(margin, y, contentWidth, 40, 4, 4, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('Público Alvo 3x Mais Assertivo', margin + 10, y + 12);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(60, 60, 60);
      doc.text('Ao mirar em quem já demonstrou interesse real no seu produto ou serviço através', margin + 10, y + 20);
      doc.text('de referências do mercado, eliminamos o desperdício e focamos em quem compra.', margin + 10, y + 27);
      y += 60;

      // --- PAGINA 3: COMO FAZEMOS ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      drawIcon(margin + 5, y - 2, 'target');
      doc.text('Estratégia de Execução', margin + 15, y);
      y += 15;

      const items = [
        { title: 'Inteligência de Mercado', desc: 'Mapeamento constante dos perfis referência para extrair o público mais engajado e comprador.', icon: 'chart' },
        { title: 'Conexão Humana Direta', desc: 'Prospecção manual e estratégica. Tratamos cada lead como único, aumentando drasticamente a taxa de resposta.', icon: 'users' },
        { title: 'Funil de Conversão Orgânico', desc: 'Direcionamento estratégico para seu checkout, WhatsApp ou link de vendas com scripts validados.', icon: 'zap' },
        { title: 'Segurança e Autoridade', desc: 'Processos que respeitam as normas das plataformas, garantindo o crescimento sustentável da sua conta.', icon: 'shield' }
      ];

      items.forEach((item, idx) => {
        const itemY = y + (idx * 28);
        drawIcon(margin + 5, itemY + 2, item.icon as any);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12.5);
        doc.setTextColor(rgb.r, rgb.g, rgb.b);
        doc.text(item.title, margin + 15, itemY + 3);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(70, 70, 70);
        const dLines = doc.splitTextToSize(item.desc, contentWidth - 20);
        doc.text(dLines, margin + 15, itemY + 10);
      });

      // --- PAGINA 4: ENTREGÁVEIS ---
      doc.addPage();
      drawGradientRect(0, 0, pageWidth, 20);
      y = 35;

      if (data.incluirCriativos) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(rgb.r, rgb.g, rgb.b);
        drawIcon(margin + 5, y - 2, 'zap');
        doc.text('Posicionamento e Criativos', margin + 15, y);
        y += 12;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(50, 50, 50);
        const criativosText = `Não basta atrair o público, sua "casa" precisa estar arrumada. Incluímos a otimização estratégica do seu perfil e a entrega de ${data.quantidadeCriativos} artes/vídeos profissionais mensais. Focamos em design de alto nível para gerar autoridade imediata e confiança no seu lead.`;
        const criativosLines = doc.splitTextToSize(criativosText, contentWidth);
        doc.text(criativosLines, margin, y);
        y += criativosLines.length * 6 + 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      drawIcon(margin + 5, y - 2, 'chart');
      doc.text('Investimento para Resultados', margin + 15, y);
      y += 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      drawIcon(margin + 5, y - 2, 'chart');
      doc.text('Investimento para Resultados', margin + 15, y);
      y += 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(50, 50, 50);
      doc.text(`Proposta para 30 dias de acompanhamento focado em gerar ROI massivo.`, margin, y);
      y += 12;

      if (data.incluirValor) {
        // Modern Value Badge
        drawGradientRect(margin, y, 90, 30);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('PLANO MENSAL EXCLUSIVO', margin + 8, y + 10);
        doc.setFontSize(24);
        doc.text(`R$ ${data.valorServico}`, margin + 8, y + 22);
        y += 45;
      }

      // Guarantee Section
      doc.setFillColor(rgb.r, rgb.g, rgb.b, 0.05);
      doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      drawIcon(margin + 8, y + 12, 'shield');
      doc.text('GARANTIA INCONDICIONAL DE 7 DIAS', margin + 18, y + 13);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Teste nossa metodologia sem riscos. Se não houver progresso, você está protegido.', margin + 18, y + 20);
      y += 40;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text('Estamos prontos para transformar o seu jogo digital.', margin, y);
      
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(data.minhaEmpresa.toUpperCase(), margin, y);

      // Download
      const fileName = `Proposta_Premium_${data.empresaDestino.replace(/\s+/g, '_') || 'Empresa'}.pdf`;
      doc.save(fileName);
      toast.success('Proposta Premium gerada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar a proposta');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <header className="sticky top-0 z-40 bg-[#050508]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-lg">Gerador de <span className="text-emerald-400">Proposta para Empresa</span></span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Crie Propostas Irresistíveis</h1>
          <p className="text-gray-400">Personalize sua proposta comercial e feche novos contratos em minutos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identidade */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2 text-emerald-400">
              <Palette className="w-5 h-5" /> Personalização
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm text-gray-400 block">Sua Logo</label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative group">
                    <img src={logoPreview} className="h-16 w-16 object-contain rounded bg-white/5 p-1" alt="Logo preview" />
                    <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => logoInputRef.current?.click()} className="h-16 w-16 rounded border-2 border-dashed border-white/10 hover:border-emerald-500/50 flex flex-col items-center justify-center transition-colors">
                    <Upload className="w-5 h-5 text-gray-500" />
                    <span className="text-[10px] text-gray-500">Logo</span>
                  </button>
                )}
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 block">Cor 1 (Topo)</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={data.corPrincipal} onChange={e => update('corPrincipal', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent" />
                      <Input value={data.corPrincipal} onChange={e => update('corPrincipal', e.target.value)} className="h-7 bg-white/5 border-white/10 text-[10px] px-1" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 block">Cor 2 (Base)</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={data.corSecundaria} onChange={e => update('corSecundaria', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent" />
                      <Input value={data.corSecundaria} onChange={e => update('corSecundaria', e.target.value)} className="h-7 bg-white/5 border-white/10 text-[10px] px-1" />
                    </div>
                  </div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Nome da Sua Empresa / Marca</label>
              <Input value={data.minhaEmpresa} onChange={e => update('minhaEmpresa', e.target.value)} placeholder="Ex: Minha Agência Digital" className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>

          {/* Destinatário */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2 text-blue-400">
              <Target className="w-5 h-5" /> Empresa Destino
            </h2>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Nome da Empresa Prospectada</label>
              <Input value={data.empresaDestino} onChange={e => update('empresaDestino', e.target.value)} placeholder="Ex: Loja de Roupas XYZ" className="bg-white/5 border-white/10 text-white" />
            </div>
            <p className="text-xs text-gray-500">Este nome aparecerá na capa e em seções estratégicas do PDF para gerar personalização.</p>
          </div>

          {/* Configurações Extras */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4 md:col-span-2">
            <h2 className="font-bold text-lg flex items-center gap-2 text-purple-400">
              <Package className="w-5 h-5" /> Detalhes da Oferta
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Incluir Valor no PDF</Label>
                    <p className="text-xs text-gray-500">Exibir o preço total do serviço.</p>
                  </div>
                  <Switch checked={data.incluirValor} onCheckedChange={v => update('incluirValor', v)} />
                </div>
                {data.incluirValor && (
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Valor do Serviço (R$)</label>
                    <Input value={data.valorServico} onChange={e => update('valorServico', e.target.value)} placeholder="497,00" className="bg-white/5 border-white/10 text-white" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Serviço de Criativos (Opcional)</Label>
                    <p className="text-xs text-gray-500">Incluir gestão de conteúdo no PDF.</p>
                  </div>
                  <Switch checked={data.incluirCriativos} onCheckedChange={v => update('incluirCriativos', v)} />
                </div>
                {data.incluirCriativos && (
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Quantidade de Criativos/Mês</label>
                    <Input type="number" value={data.quantidadeCriativos} onChange={e => update('quantidadeCriativos', e.target.value)} className="bg-white/5 border-white/10 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Button onClick={generatePDF} disabled={generating} className="w-full max-w-md h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            {generating ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Download className="w-6 h-6 mr-2" />}
            Gerar Proposta em PDF
          </Button>
          <p className="text-gray-500 text-xs text-center max-w-md">
            Sua proposta incluirá gatilhos mentais de autoridade, escassez e foco em resultados orgânicos, destacando que você passará 10h/dia cuidando do perfil do cliente.
          </p>
        </div>

        {/* Preview Summary */}
        <div className="mt-12 border-t border-white/5 pt-12">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Eye className="w-5 h-5 text-gray-400" /> O que sua proposta aborda:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: <Zap className="w-5 h-5 text-yellow-400" />, title: "Venda no Orgânico", desc: "Foco em vender mais sem precisar gastar fortunas em anúncios." },
              { icon: <Users className="w-5 h-5 text-blue-400" />, title: "Público Alvo 10x", desc: "Busca direta no público dos concorrentes para assertividade máxima." },
              { icon: <Target className="w-5 h-5 text-red-400" />, title: "Prospecção Ativa", desc: "Dedicação de 10h/dia no perfil do cliente para fechar contratos." },
              { icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, title: "Conexões Reais", desc: "Interações em massa para criar conexões e fidelizar clientes." },
              { icon: <ShieldCheck className="w-5 h-5 text-purple-400" />, title: "Garantia 7 Dias", desc: "Segurança total para o cliente fechar o negócio com você." },
              { icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />, title: "Marca Profissional", desc: "Design personalizado com sua marca e cores para autoridade." },
            ].map((item, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                <div className="mb-2">{item.icon}</div>
                <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
