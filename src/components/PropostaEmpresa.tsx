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

      // --- CAPA ---
      // Background Accent
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(0, 0, pageWidth, 40, 'F');

      y = 60;
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
          const logoH = 25;
          const logoW = logoH * ratio;
          doc.addImage(data.logoUrl, 'PNG', (pageWidth - logoW) / 2, y, logoW, logoH);
          y += logoH + 20;
        } catch {
          y += 10;
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('PROPOSTA ESTRATÉGICA', pageWidth / 2, y, { align: 'center' });
      
      y += 12;
      doc.setFontSize(16);
      doc.setTextColor(80, 80, 80);
      doc.text(`Preparada para: ${data.empresaDestino.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });

      y += 40;
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      doc.text('Aumente suas vendas e engajamento no orgânico', pageWidth / 2, y, { align: 'center' });
      
      y += 8;
      doc.setFontSize(14);
      doc.text('sem gastar fortunas com anúncios pagos.', pageWidth / 2, y, { align: 'center' });

      // Footer Cover
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(data.minhaEmpresa, pageWidth / 2, pageHeight - 15, { align: 'center' });

      // --- PAGINA 2: O PROBLEMA & A SOLUÇÃO ---
      doc.addPage();
      y = 25;

      // Header Small
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(0, 0, pageWidth, 15, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('O Cenário Atual', margin, y);
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const introText = `Atualmente, a maioria das empresas acredita que para vender no Instagram é necessário investir fortunas em tráfego pago (anúncios). No entanto, o custo por clique está cada vez mais alto e a assertividade muitas vezes deixa a desejar.`;
      const introLines = doc.splitTextToSize(introText, contentWidth);
      doc.text(introLines, margin, y);
      y += introLines.length * 6 + 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('Nossa Metodologia: 100% Orgânica e Humana', margin, y);
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const methodText = `Nossa metodologia é totalmente focada no orgânico, entregando resultados sem que você precise gastar fortunas em anúncios. O segredo está na assertividade: nós vamos direto no público dos seus CONCORRENTES como referência, buscando um público extremamente nichado e qualificado.`;
      const methodLines = doc.splitTextToSize(methodText, contentWidth);
      doc.text(methodLines, margin, y);
      y += methodLines.length * 6 + 15;

      // Box Destaque
      doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      doc.setLineWidth(0.5);
      doc.setFillColor(rgb.r, rgb.g, rgb.b, 0.05);
      doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('Público 10x mais assertivo', margin + 10, y + 12);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Ao buscar o público de quem já é referência no seu nicho, acertamos 10x mais', margin + 10, y + 20);
      doc.text('o perfil do seu cliente ideal, sem desperdício de tempo ou dinheiro.', margin + 10, y + 26);
      y += 50;

      // --- PAGINA 3: COMO FAZEMOS ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('A Execução do Trabalho', margin, y);
      y += 12;

      const items = [
        { title: 'Prospecção Direta Diária', desc: 'Nossa equipe passa mais de 10 horas por dia dedicada exclusivamente ao seu Instagram, fazendo a prospecção direta e manual.' },
        { title: 'Interações e Conexões Reais', desc: 'Começamos interagindo em massa com o público-alvo para criar conexões verdadeiras e despertar o interesse genuíno pelo seu negócio.' },
        { title: 'Abordagem Estratégica', desc: 'Após a interação inicial, enviamos mensagens com sua promoção, desconto, link de checkout ou o que você desejar comunicar.' },
        { title: 'Metodologia Segura', desc: 'Esta prospecção não pode ser feita às pressas. Seguimos rigorosamente as políticas do Instagram para garantir a segurança da sua conta.' }
      ];

      items.forEach(item => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(rgb.r, rgb.g, rgb.b);
        doc.text(`• ${item.title}`, margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(item.desc, contentWidth - 10);
        doc.text(descLines, margin + 5, y);
        y += descLines.length * 5 + 6;
      });

      // --- PAGINA 4: ENTREGÁVEIS & VALOR ---
      if (y > 200 || data.incluirCriativos) {
        doc.addPage();
        y = 25;
        // Header Small
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(0, 0, pageWidth, 15, 'F');
      } else {
        y += 10;
      }

      if (data.incluirCriativos) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(rgb.r, rgb.g, rgb.b);
        doc.text('Bônus: Gestão de Conteúdo e Criativos', margin, y);
        y += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        const criativosText = `Além da prospecção ativa, incluiremos a criação de ${data.quantidadeCriativos} criativos profissionais por mês. Estes posts são desenhados com gatilhos mentais específicos para converter seguidores em compradores fiéis, elevando o nível profissional do seu perfil.`;
        const criativosLines = doc.splitTextToSize(criativosText, contentWidth);
        doc.text(criativosLines, margin, y);
        y += criativosLines.length * 6 + 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('Investimento Estratégico', margin, y);
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Plano mensal de 30 dias de acompanhamento e prospecção ativa.', margin, y);
      y += 10;

      if (data.incluirValor) {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.roundedRect(margin, y, 80, 25, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('INVESTIMENTO MENSAL', margin + 5, y + 8);
        doc.setFontSize(18);
        doc.text(`R$ ${data.valorServico}`, margin + 5, y + 18);
        y += 35;
      }

      // Garantia
      doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text('GARANTIA DE SATISFAÇÃO DE 7 DIAS', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text('Estamos tão seguros da nossa metodologia que oferecemos 7 dias para você testar nossos serviços.', margin, y);
      y += 20;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('Aguardo seu retorno para iniciarmos o crescimento da sua empresa.', margin, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(data.minhaEmpresa, margin, y);

      // Download
      const fileName = `Proposta_${data.empresaDestino.replace(/\s+/g, '_') || 'Empresa'}.pdf`;
      doc.save(fileName);
      toast.success('Proposta gerada com sucesso!');
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
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-gray-500 block">Cor Principal do PDF</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={data.corPrincipal} onChange={e => update('corPrincipal', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
                    <Input value={data.corPrincipal} onChange={e => update('corPrincipal', e.target.value)} className="h-8 bg-white/5 border-white/10 text-xs" />
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
