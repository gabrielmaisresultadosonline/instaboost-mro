import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileText, Upload, Download, Loader2, X, Eye, Sparkles, Target, Users, Zap, CheckCircle2, ShieldCheck, Palette, Package, ZoomIn, Maximize2 } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const update = (field: keyof PropostaData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const renderPreview = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size for A4 ratio preview
    canvas.width = 500;
    canvas.height = 707;

    // Draw background
    ctx.fillStyle = data.corSecundaria;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, data.corPrincipal);
    grad.addColorStop(1, data.corSecundaria);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 200);

    // Text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PROPOSTA', canvas.width/2, 100);
    ctx.font = '20px Arial';
    ctx.fillText(data.empresaDestino || 'EMPRESA DESTINO', canvas.width/2, 140);
  };

  useEffect(() => {
    renderPreview();
  }, [data]);

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
      toast.error('Preencha os dados básicos');
      return;
    }

    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      // PDF generation logic here (simplified as discussed)
      doc.text(`Proposta para ${data.empresaDestino}`, 20, 20);
      doc.save(`Proposta_${data.empresaDestino}.pdf`);
      toast.success('PDF Gerado!');
    } catch (err) {
      toast.error('Erro ao gerar');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Editor */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft /></button>
            <h1 className="text-2xl font-bold">Gerador de Propostas</h1>
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <Label>Cor Primária</Label>
                  <Input type="color" value={data.corPrincipal} onChange={e => update('corPrincipal', e.target.value)} className="h-10 cursor-pointer" />
               </div>
               <div>
                  <Label>Cor Secundária</Label>
                  <Input type="color" value={data.corSecundaria} onChange={e => update('corSecundaria', e.target.value)} className="h-10 cursor-pointer" />
               </div>
            </div>
            <Input placeholder="Empresa Destino" value={data.empresaDestino} onChange={e => update('empresaDestino', e.target.value)} />
            <Button onClick={generatePDF} className="w-full h-12 bg-emerald-500 font-bold">
               {generating ? <Loader2 className="animate-spin" /> : <Download className="mr-2" />} Gerar Proposta
            </Button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="sticky top-20">
          <div className="bg-white/5 p-4 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold flex items-center gap-2"><ZoomIn size={18}/> Prévia em Tempo Real</h2>
            </div>
            <canvas ref={canvasRef} className="w-full rounded-lg border border-white/10 shadow-xl" />
          </div>
        </div>

      </div>
    </div>
  );
};
