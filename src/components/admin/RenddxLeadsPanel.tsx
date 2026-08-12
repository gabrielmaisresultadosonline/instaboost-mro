import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, Search, Download, Calendar, 
  Mail, Phone, User, RefreshCw, Loader2,
  Filter, ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  created_at: string;
  ip_address: string;
}

const RenddxLeadsPanel = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('renddx_leads')
        .select('*')
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [sortOrder]);

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.whatsapp.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'WhatsApp', 'Data', 'IP'];
    const rows = filteredLeads.map(lead => [
      lead.name,
      lead.email,
      lead.whatsapp,
      new Date(lead.created_at).toLocaleString('pt-BR'),
      lead.ip_address || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `renddx-leads-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-green-500" />
            Leads Renddx
          </h2>
          <p className="text-muted-foreground text-sm">Gerencie os cadastros capturados no funil /renddx</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={fetchLeads} className="h-9 font-bold">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="h-9 font-bold bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-zinc-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground uppercase font-bold tracking-tighter">Total de Leads</p>
            <p className="text-2xl font-black">{leads.length}</p>
          </div>
        </div>
        {/* Adicionar mais stats se necessário */}
      </div>

      <div className="bg-card border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome, email ou whatsapp..."
              className="pl-10 h-10 border-zinc-200 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="text-xs font-bold"
            >
              <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
              {sortOrder === 'asc' ? 'Mais antigos' : 'Mais recentes'}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Contato</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest text-center">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-300 mb-2" />
                    <p className="text-zinc-500 font-medium">Carregando leads...</p>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <Users className="w-12 h-12 mx-auto text-zinc-200 mb-4" />
                    <p className="text-zinc-500 font-medium">Nenhum lead encontrado.</p>
                  </td>
                </tr>
              ) : filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 leading-none mb-1">{lead.name}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                           <User className="w-3 h-3" /> Lead Capturado
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center gap-2 text-zinc-700">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        {lead.email}
                      </p>
                      <p className="text-sm font-medium flex items-center gap-2 text-zinc-700">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        {lead.whatsapp}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="text-sm font-bold text-zinc-900">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">
                      {new Date(lead.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/30">
          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest text-center">
            Exibindo {filteredLeads.length} de {leads.length} leads registrados
          </p>
        </div>
      </div>
    </div>
  );
};

export default RenddxLeadsPanel;
