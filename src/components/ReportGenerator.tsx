import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, FileText, Plus, Loader2, Download, Trash2, Edit3, Save, Building2, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface ReportData {
  companyName: string;
  instagramUsername: string;
  startDate: string;
  alcanceInicial: number;
  alcanceAtual: number;
  visitasInicial: number;
  visitasAtual: number;
  seguidoresInicial: number;
  seguidoresAtual: number;
  mensagensEnviadas: number;
  totalContasAlcancadas: number;
  createdAt: string;
  lastGeneratedAt: string;
}

interface ReportGeneratorProps {
  onBack: () => void;
  mroUsername: string;
}

const calcPercent = (initial: number, current: number): number => {
  if (initial <= 0) return 0;
  return Math.round(((current - initial) / initial) * 100);
};

const formatNumber = (n: number): string => {
  return n.toLocaleString('pt-BR');
};

const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
};

const formatDateLongBR = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

const getMonthRange = (startDate: string): string => {
  if (!startDate) return '';
  const start = new Date(startDate + 'T00:00:00');
  const now = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${months[start.getMonth()]} - ${months[now.getMonth()]} ${now.getFullYear()}`;
};

export const ReportGenerator = ({ onBack, mroUsername }: ReportGeneratorProps) => {
  const [reports, setReports] = useState<Record<string, ReportData>>({});
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ReportData | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<ReportData>({
    companyName: '',
    instagramUsername: '',
    startDate: new Date().toISOString().split('T')[0],
    alcanceInicial: 0,
    alcanceAtual: 0,
    visitasInicial: 0,
    visitasAtual: 0,
    seguidoresInicial: 0,
    seguidoresAtual: 0,
    mensagensEnviadas: 0,
    totalContasAlcancadas: 0,
    createdAt: new Date().toISOString(),
    lastGeneratedAt: '',
  });

  // Load profiles and reports
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load synced profiles
        const profilesRes = await supabase.functions.invoke('squarecloud-profile-storage', {
          body: { action: 'load', squarecloud_username: mroUsername }
        });
        if (profilesRes.data?.success) {
          setProfiles(profilesRes.data.profiles || []);
        }

        // Load saved reports
        const reportsRes = await supabase.functions.invoke('report-storage', {
          body: { action: 'load', squarecloud_username: mroUsername }
        });
        if (reportsRes.data?.success) {
          setReports(reportsRes.data.reports || {});
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [mroUsername]);

  const saveReports = useCallback(async (updatedReports: Record<string, ReportData>) => {
    setSaving(true);
    try {
      await supabase.functions.invoke('report-storage', {
        body: { action: 'save', squarecloud_username: mroUsername, reports: updatedReports }
      });
      setReports(updatedReports);
      toast.success('Relatórios salvos!');
    } catch (err) {
      toast.error('Erro ao salvar relatórios');
    } finally {
      setSaving(false);
    }
  }, [mroUsername]);

  const handleCreateReport = () => {
    if (!newForm.companyName.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }
    const key = newForm.companyName.trim().toLowerCase().replace(/\s+/g, '-');
    if (reports[key]) {
      toast.error('Já existe um relatório para essa empresa!');
      return;
    }
    const updated = { ...reports, [key]: { ...newForm, createdAt: new Date().toISOString() } };
    saveReports(updated);
    setShowNewForm(false);
    setNewForm({
      companyName: '', instagramUsername: '', startDate: new Date().toISOString().split('T')[0],
      alcanceInicial: 0, alcanceAtual: 0, visitasInicial: 0, visitasAtual: 0,
      seguidoresInicial: 0, seguidoresAtual: 0, mensagensEnviadas: 0, totalContasAlcancadas: 0,
      createdAt: '', lastGeneratedAt: '',
    });
  };

  const handleSaveEdit = (key: string) => {
    if (!editForm) return;
    const updated = { ...reports, [key]: editForm };
    saveReports(updated);
    setEditingReport(null);
    setEditForm(null);
  };

  const handleDeleteReport = (key: string) => {
    const updated = { ...reports };
    delete updated[key];
    saveReports(updated);
  };

  const startEdit = (key: string) => {
    setEditingReport(key);
    setEditForm({ ...reports[key] });
  };

  const selectProfile = (ig: string) => {
    const profile = profiles.find(p => p.instagram_username === ig);
    if (profile?.profile_data) {
      const pd = profile.profile_data;
      setNewForm(prev => ({
        ...prev,
        instagramUsername: ig,
        companyName: prev.companyName || ig,
        seguidoresInicial: pd.followers || 0,
        seguidoresAtual: pd.followers || 0,
      }));
    } else {
      setNewForm(prev => ({ ...prev, instagramUsername: ig }));
    }
  };

  // Generate PDF matching the template design
  const generatePDF = async (key: string) => {
    const report = reports[key];
    if (!report) return;
    setGenerating(key);

    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      const W = pdf.internal.pageSize.getWidth(); // ~297
      const H = pdf.internal.pageSize.getHeight(); // ~210

      const alcancePercent = calcPercent(report.alcanceInicial, report.alcanceAtual);
      const visitasPercent = calcPercent(report.visitasInicial, report.visitasAtual);
      const seguidoresPercent = calcPercent(report.seguidoresInicial, report.seguidoresAtual);
      const startFormatted = formatDateBR(report.startDate);
      const currentFormatted = formatDateBR(new Date().toISOString().split('T')[0]);
      const monthRange = getMonthRange(report.startDate);

      // ════════════ PAGE 1 - COVER ════════════
      pdf.setFillColor(10, 10, 14);
      pdf.rect(0, 0, W, H, 'F');

      // Accent line
      const lineY = 55;
      pdf.setFillColor(239, 68, 68); // red
      pdf.rect(W / 2 - 25, lineY, 20, 3, 'F');
      pdf.setFillColor(251, 191, 36); // amber
      pdf.rect(W / 2 - 5, lineY, 20, 3, 'F');
      pdf.setFillColor(16, 185, 129); // green
      pdf.rect(W / 2 + 15, lineY, 20, 3, 'F');

      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(36);
      pdf.setTextColor(255, 255, 255);
      pdf.text('RELATÓRIO DE RESULTADOS', W / 2, 78, { align: 'center' });
      
      pdf.setFontSize(32);
      pdf.setTextColor(255, 255, 255);
      pdf.text(report.companyName.toUpperCase(), W / 2, 92, { align: 'center' });

      // Subtitle
      pdf.setFontSize(11);
      pdf.setTextColor(160, 160, 160);
      pdf.text('PERFORMANCE & EVOLUÇÃO', W / 2, 105, { align: 'center', charSpace: 3 });

      // Date
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 200);
      pdf.text(`INÍCIO: ${startFormatted.toUpperCase()} | ATUAL: ${currentFormatted.toUpperCase()}`, W / 2, 120, { align: 'center', charSpace: 2 });

      // 3 main percentages
      const percY = 150;
      const percSpacing = 55;
      const percStartX = W / 2 - percSpacing;

      const percentages = [
        { value: `+${alcancePercent}%`, label: 'CRESC. ALCANCE' },
        { value: `+${visitasPercent}%`, label: 'CRESC. VISITAS' },
        { value: `+${seguidoresPercent}%`, label: 'CRESC. SEGUIDORES' },
      ];

      percentages.forEach((p, i) => {
        const x = percStartX + i * percSpacing;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(251, 191, 36); // amber/gold
        pdf.text(p.value, x, percY, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(160, 160, 160);
        pdf.text(p.label, x, percY + 7, { align: 'center' });
      });

      // Footer
      pdf.setFontSize(6);
      pdf.setTextColor(100, 100, 100);
      pdf.text('DOCUMENTO CONFIDENCIAL · ANÁLISE COMPARATIVA DE PERFORMANCE 2026', W / 2, H - 10, { align: 'center' });

      // ════════════ PAGE 2 - EVOLUÇÃO HISTÓRICA ════════════
      pdf.addPage();
      pdf.setFillColor(10, 10, 14);
      pdf.rect(0, 0, W, H, 'F');

      // Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(239, 68, 119);
      pdf.text('EVOLUÇÃO HISTÓRICA', 20, 20);
      pdf.setTextColor(160, 160, 160);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(monthRange, W - 20, 20, { align: 'right' });

      // Line
      pdf.setDrawColor(60, 60, 60);
      pdf.line(20, 24, W - 20, 24);

      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Crescimento Consolidado', 20, 40);

      // Vision box
      pdf.setFillColor(20, 20, 30);
      pdf.roundedRect(20, 48, W - 40, 30, 2, 2, 'F');
      pdf.setDrawColor(239, 68, 119);
      pdf.setLineWidth(0.8);
      pdf.line(22, 50, 22, 74);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(239, 68, 119);
      pdf.text(`VISÃO GERAL DESDE ${startFormatted.toUpperCase()}`, 28, 56);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(180, 180, 180);
      const visionText = `Desde o início da nossa gestão, o perfil experimentou uma transformação radical. Saímos de uma base de interação limitada para um ecossistema de alto alcance e conversão constante. Os números abaixo refletem o impacto direto das nossas estratégias de conteúdo e interação.`;
      const splitVision = pdf.splitTextToSize(visionText, W - 50);
      pdf.text(splitVision, 28, 63);

      // Table
      const tableY = 88;
      const colWidths = [70, 55, 55, 55];
      const tableW = colWidths.reduce((a, b) => a + b, 0);
      const tableX = (W - tableW) / 2;

      // Header row
      pdf.setFillColor(18, 18, 28);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      const headers = ['MÉTRICA PRINCIPAL', `INÍCIO (${startFormatted})`, `ATUAL (${currentFormatted})`, 'EVOLUÇÃO'];
      let cx = tableX;
      headers.forEach((h, i) => {
        pdf.text(h, cx + 5, tableY);
        cx += colWidths[i];
      });

      pdf.setDrawColor(40, 40, 50);
      pdf.line(tableX, tableY + 3, tableX + tableW, tableY + 3);

      // Data rows
      const rows = [
        { metric: 'Alcance Mensal', initial: formatNumber(report.alcanceInicial), current: formatNumber(report.alcanceAtual), percent: `+${alcancePercent}%` },
        { metric: 'Visitas ao Perfil', initial: formatNumber(report.visitasInicial), current: formatNumber(report.visitasAtual), percent: `+${visitasPercent}%` },
        { metric: 'Novos Seguidores', initial: formatNumber(report.seguidoresInicial), current: formatNumber(report.seguidoresAtual), percent: `+${seguidoresPercent}%` },
      ];

      rows.forEach((row, i) => {
        const ry = tableY + 14 + i * 16;
        cx = tableX;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(230, 230, 230);
        pdf.text(row.metric, cx + 5, ry);
        cx += colWidths[0];

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(180, 180, 180);
        pdf.text(row.initial, cx + 5, ry);
        cx += colWidths[1];

        pdf.text(row.current, cx + 5, ry);
        cx += colWidths[2];

        // Badge
        pdf.setFillColor(16, 60, 35);
        pdf.roundedRect(cx + 3, ry - 4, 24, 7, 2, 2, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(34, 197, 94);
        pdf.text(row.percent, cx + 15, ry + 0.5, { align: 'center' });

        // Row separator
        if (i < rows.length - 1) {
          pdf.setDrawColor(35, 35, 45);
          pdf.line(tableX, ry + 7, tableX + tableW, ry + 7);
        }
      });

      // ════════════ PAGE 3 - PERFORMANCE RECENTE ════════════
      pdf.addPage();
      pdf.setFillColor(10, 10, 14);
      pdf.rect(0, 0, W, H, 'F');

      // Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(239, 68, 119);
      pdf.text('PERFORMANCE RECENTE', 20, 20);
      pdf.setTextColor(160, 160, 160);
      pdf.setFont('helvetica', 'normal');
      pdf.text(monthRange, W - 20, 20, { align: 'right' });

      pdf.setDrawColor(60, 60, 60);
      pdf.line(20, 24, W - 20, 24);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Resultados Últimos 30 Dias', 20, 42);

      // 4 Metric cards
      const cardW = (W - 60) / 2;
      const cardH = 40;
      const cards = [
        { label: 'ALCANCE (30D)', value: formatNumber(report.alcanceAtual), sub: `↑ ${Math.abs(calcPercent(report.alcanceInicial, report.alcanceAtual))}% vs. Período Anterior` },
        { label: 'VISITAS AO PERFIL (30D)', value: formatNumber(report.visitasAtual), sub: `↑ ${Math.abs(calcPercent(report.visitasInicial, report.visitasAtual))}% vs. Período Anterior` },
        { label: 'NOVOS SEGUIDORES (30D)', value: formatNumber(report.seguidoresAtual), sub: `↑ ${Math.abs(calcPercent(report.seguidoresInicial, report.seguidoresAtual))}% vs. Período Anterior` },
        { label: 'MENSAGENS ENVIADAS', value: formatNumber(report.mensagensEnviadas), sub: 'Público Quente / Leads' },
      ];

      cards.forEach((card, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 20 + col * (cardW + 15);
        const cy = 52 + row * (cardH + 10);

        pdf.setFillColor(20, 20, 30);
        pdf.setDrawColor(50, 50, 60);
        pdf.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(120, 120, 120);
        pdf.text(card.label, cx + 8, cy + 10);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(255, 255, 255);
        pdf.text(card.value, cx + 8, cy + 26);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(34, 197, 94);
        pdf.text(card.sub, cx + 8, cy + 34);
      });

      // Interaction section
      const intY = 160;
      pdf.setFillColor(20, 20, 30);
      pdf.roundedRect(20, intY, W - 40, 30, 2, 2, 'F');
      pdf.setDrawColor(239, 68, 119);
      pdf.setLineWidth(0.8);
      pdf.line(22, intY + 2, 22, intY + 28);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(239, 68, 119);
      pdf.text('INTERAÇÃO COM CONCORRENTES', 28, intY + 10);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(180, 180, 180);
      pdf.text('A MRO (Mais Resultados Online) trabalha ativamente na interação com o público dos concorrentes,', 28, intY + 18);
      pdf.text('direcionando visitas qualificadas para o perfil da empresa.', 28, intY + 24);

      // ════════════ PAGE 4 - CONCLUSÃO ════════════
      pdf.addPage();
      pdf.setFillColor(10, 10, 14);
      pdf.rect(0, 0, W, H, 'F');

      // Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(239, 68, 119);
      pdf.text('VISÃO ESTRATÉGICA', 20, 20);
      pdf.setTextColor(160, 160, 160);
      pdf.setFont('helvetica', 'normal');
      pdf.text(monthRange, W - 20, 20, { align: 'right' });

      pdf.setDrawColor(60, 60, 60);
      pdf.line(20, 24, W - 20, 24);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Conclusão & Próximos Passos', 20, 42);

      // Conclusion box
      pdf.setFillColor(20, 20, 30);
      pdf.roundedRect(20, 50, W - 40, 50, 2, 2, 'F');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 200);
      const conclusionText = `O comparativo de ${startFormatted} a ${currentFormatted} prova que a metodologia aplicada gerou um crescimento de +${alcancePercent}% em visibilidade. Saímos de uma operação inicial para uma presença digital robusta e lucrativa.`;
      const splitConclusion = pdf.splitTextToSize(conclusionText, W - 50);
      pdf.text(splitConclusion, 28, 62);

      // Two columns
      const colY = 80;
      const halfW = (W - 50) / 2;

      // Left - Destaques
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(239, 68, 119);
      pdf.text('DESTAQUES DA GESTÃO', 28, colY);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      const highlights = [
        `Crescimento de Alcance: +${alcancePercent}% (de ${formatNumber(report.alcanceInicial)} para ${formatNumber(report.alcanceAtual)}).`,
        `Conversão de Perfil: +${visitasPercent}% em visitas qualificadas.`,
        `Engajamento Direto: ${formatNumber(report.mensagensEnviadas)} leads abordados no último mês.`,
      ];
      highlights.forEach((h, i) => {
        pdf.text(`• ${h}`, 28, colY + 8 + i * 7);
      });

      // Right - Planejamento
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(239, 68, 119);
      pdf.text('PLANEJAMENTO PRÓXIMO CICLO', 28 + halfW + 10, colY);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(200, 200, 200);
      const plans = [
        'Escalar a prospecção ativa para público dos concorrentes.',
        'Implementar funil de Direct automatizado para novos seguidores.',
        `Focar em Reels de alta retenção para manter o alcance acima de ${formatNumber(report.alcanceAtual)}.`,
      ];
      plans.forEach((p, i) => {
        pdf.text(`• ${p}`, 28 + halfW + 10, colY + 8 + i * 7);
      });

      // Save
      const fileName = `Relatorio_${report.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      // Update last generated date
      const updated = { ...reports, [key]: { ...report, lastGeneratedAt: new Date().toISOString() } };
      saveReports(updated);

      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(null);
    }
  };

  const ReportForm = ({ form, onChange, onSave, onCancel, title, saveLabel }: {
    form: ReportData;
    onChange: (f: ReportData) => void;
    onSave: () => void;
    onCancel: () => void;
    title: string;
    saveLabel: string;
  }) => (
    <div className="bg-[#12121f] border border-white/10 rounded-xl p-5 space-y-4">
      <h3 className="text-white font-bold text-lg flex items-center gap-2">
        <Building2 className="h-5 w-5 text-yellow-400" />
        {title}
      </h3>

      {/* Profile selector - click to select, no typing */}
      <div>
        <label className="text-white/60 text-xs block mb-1.5">Selecionar Perfil Cadastrado *</label>
        {profiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profiles.map((p: any) => (
              <button
                key={p.instagram_username}
                onClick={() => {
                  const pd = p.profile_data || {};
                  onChange({
                    ...form,
                    instagramUsername: p.instagram_username,
                    companyName: p.instagram_username,
                    seguidoresInicial: pd.followers || 0,
                    seguidoresAtual: pd.followers || 0,
                    alcanceInicial: pd.reach || pd.avgLikes || 0,
                    alcanceAtual: pd.reach || pd.avgLikes || 0,
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  form.instagramUsername === p.instagram_username
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                @{p.instagram_username}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-white/30 text-xs">Nenhum perfil cadastrado. Cadastre perfis na aba Instagram primeiro.</p>
        )}
      </div>

      {form.instagramUsername && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-white/60 text-xs block mb-1">Empresa (perfil selecionado)</label>
            <div className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm font-medium">@{form.companyName}</div>
          </div>
          <div>
            <label className="text-white/60 text-xs block mb-1">Data de Início</label>
            <Input type="date" value={form.startDate} onChange={e => onChange({ ...form, startDate: e.target.value })} className="bg-white/5 border-white/10 text-white" />
          </div>
        </div>
      )}

      <div className="border-t border-white/10 pt-3">
        <p className="text-yellow-400 text-xs font-bold mb-3 flex items-center gap-1"><BarChart3 size={14} /> Métricas Iniciais vs Atuais</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-white/40 text-[10px] block mb-1">Alcance Inicial</label>
            <Input type="number" value={form.alcanceInicial || ''} onChange={e => onChange({ ...form, alcanceInicial: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="text-white/40 text-[10px] block mb-1">Alcance Atual</label>
            <Input type="number" value={form.alcanceAtual || ''} onChange={e => onChange({ ...form, alcanceAtual: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white text-sm" />
          </div>
          <div className="flex items-end pb-2">
            <span className="text-green-400 font-bold text-sm">+{calcPercent(form.alcanceInicial, form.alcanceAtual)}%</span>
          </div>

          <div>
            <label className="text-white/40 text-[10px] block mb-1">Visitas Inicial</label>
            <Input type="number" value={form.visitasInicial || ''} onChange={e => onChange({ ...form, visitasInicial: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="text-white/40 text-[10px] block mb-1">Visitas Atual</label>
            <Input type="number" value={form.visitasAtual || ''} onChange={e => onChange({ ...form, visitasAtual: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white text-sm" />
          </div>
          <div className="flex items-end pb-2">
            <span className="text-green-400 font-bold text-sm">+{calcPercent(form.visitasInicial, form.visitasAtual)}%</span>
          </div>

          <div>
            <label className="text-white/40 text-[10px] block mb-1">Seguidores Inicial</label>
            <Input type="number" value={form.seguidoresInicial || ''} onChange={e => onChange({ ...form, seguidoresInicial: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="text-white/40 text-[10px] block mb-1">Seguidores Atual</label>
            <Input type="number" value={form.seguidoresAtual || ''} onChange={e => onChange({ ...form, seguidoresAtual: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white text-sm" />
          </div>
          <div className="flex items-end pb-2">
            <span className="text-green-400 font-bold text-sm">+{calcPercent(form.seguidoresInicial, form.seguidoresAtual)}%</span>
          </div>

          <div>
            <label className="text-white/40 text-[10px] block mb-1">Mensagens Enviadas</label>
            <Input type="number" value={form.mensagensEnviadas || ''} onChange={e => onChange({ ...form, mensagensEnviadas: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white text-sm" />
          </div>
          <div>
            <label className="text-white/40 text-[10px] block mb-1">Total Contas Alcançadas</label>
            <Input type="number" value={form.totalContasAlcancadas || ''} onChange={e => onChange({ ...form, totalContasAlcancadas: parseInt(e.target.value) || 0 })} className="bg-white/5 border-white/10 text-white text-sm" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} className="border-white/10 text-white/60">Cancelar</Button>
        <Button size="sm" onClick={onSave} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold">{saveLabel}</Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button size="sm" onClick={onBack} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold">
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-black">Relatórios de Empresas</h1>
            <p className="text-white/40 text-sm">Gere relatórios profissionais para seus clientes</p>
          </div>
        </div>

        {/* New report button */}
        {!showNewForm && (
          <Button onClick={() => setShowNewForm(true)} className="mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold hover:from-yellow-500 hover:to-orange-500">
            <Plus size={16} /> Nova Empresa / Relatório
          </Button>
        )}

        {/* New report form */}
        {showNewForm && (
          <div className="mb-6">
            <ReportForm
              form={newForm}
              onChange={setNewForm}
              onSave={handleCreateReport}
              onCancel={() => setShowNewForm(false)}
              title="Cadastrar Nova Empresa"
              saveLabel="Salvar Empresa"
            />
          </div>
        )}

        {/* Reports list */}
        {Object.keys(reports).length === 0 && !showNewForm ? (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-lg">Nenhum relatório cadastrado</p>
            <p className="text-white/20 text-sm mt-1">Clique em "Nova Empresa" para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(reports).map(([key, report]) => (
              <div key={key}>
                {editingReport === key && editForm ? (
                  <ReportForm
                    form={editForm}
                    onChange={setEditForm}
                    onSave={() => handleSaveEdit(key)}
                    onCancel={() => { setEditingReport(null); setEditForm(null); }}
                    title={`Editando: ${report.companyName}`}
                    saveLabel="Salvar Alterações"
                  />
                ) : (
                  <div className="bg-[#12121f] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                          {report.companyName}
                        </h3>
                        {report.instagramUsername && (
                          <p className="text-white/40 text-xs mt-0.5">@{report.instagramUsername}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-3">
                          <div className="bg-white/5 rounded-lg px-3 py-1.5">
                            <span className="text-white/40 text-[10px] block">Alcance</span>
                            <span className="text-green-400 font-bold text-sm">+{calcPercent(report.alcanceInicial, report.alcanceAtual)}%</span>
                          </div>
                          <div className="bg-white/5 rounded-lg px-3 py-1.5">
                            <span className="text-white/40 text-[10px] block">Visitas</span>
                            <span className="text-green-400 font-bold text-sm">+{calcPercent(report.visitasInicial, report.visitasAtual)}%</span>
                          </div>
                          <div className="bg-white/5 rounded-lg px-3 py-1.5">
                            <span className="text-white/40 text-[10px] block">Seguidores</span>
                            <span className="text-green-400 font-bold text-sm">+{calcPercent(report.seguidoresInicial, report.seguidoresAtual)}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-white/30 text-[10px]">
                          <span className="flex items-center gap-1"><Calendar size={10} /> Início: {report.startDate}</span>
                          {report.lastGeneratedAt && (
                            <span>Último PDF: {new Date(report.lastGeneratedAt).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => generatePDF(key)}
                          disabled={generating === key}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-xs"
                        >
                          {generating === key ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          {report.lastGeneratedAt ? 'Novo Relatório' : 'Gerar PDF'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEdit(key)} className="border-white/10 text-white/60 text-xs">
                          <Edit3 size={12} /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteReport(key)} className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">
                          <Trash2 size={12} /> Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {saving && (
          <div className="fixed bottom-4 right-4 bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg">
            <Loader2 size={14} className="animate-spin" /> Salvando...
          </div>
        )}
      </div>
    </div>
  );
};
