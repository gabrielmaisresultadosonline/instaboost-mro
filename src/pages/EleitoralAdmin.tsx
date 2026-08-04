import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileDown, User, Calendar, Phone, Mail, Instagram, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EleitoralLead {
  id: string;
  created_at: string;
  nome: string;
  whatsapp: string;
  email: string;
  instagram: string;
  cargo: string;
  candidatura_definida: string;
  equipe_marketing: string;
  investimento_anuncios: string;
  maior_dificuldade: string;
  urgencia: string;
}

const EleitoralAdmin = () => {
  const [leads, setLeads] = useState<EleitoralLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eleitoral_leads' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as any) || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.whatsapp?.includes(searchTerm)
  );

  const exportCSV = () => {
    const headers = ['Data', 'Nome', 'WhatsApp', 'Email', 'Instagram', 'Cargo', 'Definida', 'Equipe', 'Investimento', 'Dificuldade', 'Urgência'];
    const rows = filteredLeads.map(l => [
      format(new Date(l.created_at), 'dd/MM/yyyy HH:mm'),
      l.nome,
      l.whatsapp,
      l.email,
      l.instagram,
      l.cargo,
      l.candidatura_definida,
      l.equipe_marketing,
      l.investimento_anuncios,
      l.maior_dificuldade,
      l.urgencia
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_eleitoral_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Leads Eleitorais</h1>
            <p className="text-zinc-400">Gerencie os diagnósticos de campanha realizados.</p>
          </div>
          <Button 
            onClick={exportCSV}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white"
          >
            <FileDown className="mr-2 w-4 h-4" /> Exportar CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 uppercase">Total de Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{leads.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 uppercase">Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">
                {leads.filter(l => format(new Date(l.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 uppercase">Conversão WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">--</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <CardTitle className="text-xl font-bold text-white">Listagem de Leads</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input 
                placeholder="Pesquisar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-950 border-zinc-800 text-white"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-950">
                  <TableRow className="hover:bg-transparent border-zinc-800">
                    <TableHead className="text-zinc-400">Data</TableHead>
                    <TableHead className="text-zinc-400">Nome</TableHead>
                    <TableHead className="text-zinc-400">WhatsApp</TableHead>
                    <TableHead className="text-zinc-400">Instagram</TableHead>
                    <TableHead className="text-zinc-400">Cargo</TableHead>
                    <TableHead className="text-zinc-400">Investimento</TableHead>
                    <TableHead className="text-zinc-400">Urgência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-zinc-500">Carregando...</TableCell>
                    </TableRow>
                  ) : filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-zinc-500">Nenhum lead encontrado.</TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="border-zinc-800 hover:bg-zinc-800/50">
                        <TableCell className="text-zinc-300 font-medium">
                          {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-white font-bold">{lead.nome}</TableCell>
                        <TableCell className="text-zinc-300">
                          <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" className="hover:text-green-400 transition-colors flex items-center gap-2">
                            <Phone className="w-3 h-3" /> {lead.whatsapp}
                          </a>
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {lead.instagram && (
                            <a href={`https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" className="hover:text-pink-400 transition-colors flex items-center gap-2">
                              <Instagram className="w-3 h-3" /> {lead.instagram}
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          <span className="px-2 py-1 bg-zinc-800 rounded text-xs">{lead.cargo}</span>
                        </TableCell>
                        <TableCell className="text-zinc-300">{lead.investimento_anuncios}</TableCell>
                        <TableCell className="text-zinc-300">
                          <span className={`px-2 py-1 rounded text-xs ${
                            lead.urgencia?.includes('imediatamente') ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {lead.urgencia}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EleitoralAdmin;
