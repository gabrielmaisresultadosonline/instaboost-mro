import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  ExternalLink, 
  Copy, 
  Trash2, 
  Edit, 
  BarChart3,
  UserPlus,
  Loader2,
  Globe,
  Sparkles
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  slug: string;
  email: string;
  pix_key: string | null;
  whatsapp: string | null;
  status: string;
  password?: string | null;
  created_at: string;
}

const PartnersPanel = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPartner, setCurrentPartner] = useState<Partial<Partner>>({});
  const { toast } = useToast();

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar parceiros",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleCreateOrUpdate = async () => {
    if (!currentPartner.name || !currentPartner.slug || !currentPartner.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, Slug e Email são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing && currentPartner.id) {
        const { error } = await supabase
          .from('partners')
          .update({
            name: currentPartner.name,
            slug: currentPartner.slug.toLowerCase().trim(),
            email: currentPartner.email.toLowerCase().trim(),
            pix_key: currentPartner.pix_key,
            whatsapp: currentPartner.whatsapp,
            status: currentPartner.status,
            password: currentPartner.password
          })
          .eq('id', currentPartner.id);

        if (error) throw error;
        toast({ title: "Parceiro atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from('partners')
          .insert([{
            name: currentPartner.name,
            slug: currentPartner.slug.toLowerCase().trim(),
            email: currentPartner.email.toLowerCase().trim(),
            pix_key: currentPartner.pix_key,
            whatsapp: currentPartner.whatsapp,
            password: currentPartner.password,
            status: 'active'
          }]);

        if (error) throw error;
        toast({ title: "Parceiro criado com sucesso!" });
      }

      setIsCreateModalOpen(false);
      setCurrentPartner({});
      setIsEditing(false);
      fetchPartners();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar parceiro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este parceiro?")) return;

    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Parceiro excluído com sucesso!" });
      fetchPartners();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir parceiro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!`, description: text });
  };

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="text-primary" /> Gestão de Parceiros Oficiais
          </h2>
          <p className="text-muted-foreground text-sm">Gerencie os acessos, links e faturamento dos seus parceiros.</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            setCurrentPartner({});
            setIsEditing(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} /> Novo Parceiro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Parceiro' : 'Cadastrar Novo Parceiro'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nome</Label>
                <Input 
                  id="name" 
                  className="col-span-3" 
                  value={currentPartner.name || ''} 
                  onChange={(e) => setCurrentPartner({...currentPartner, name: e.target.value})}
                  placeholder="Nome do parceiro"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="slug" className="text-right">Slug/Link</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">/promo/</span>
                  <Input 
                    id="slug" 
                    value={currentPartner.slug || ''} 
                    onChange={(e) => setCurrentPartner({...currentPartner, slug: e.target.value})}
                    placeholder="ex: joao-vendas"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  className="col-span-3" 
                  value={currentPartner.email || ''} 
                  onChange={(e) => setCurrentPartner({...currentPartner, email: e.target.value})}
                  placeholder="email@parceiro.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pass" className="text-right">Senha</Label>
                <Input 
                  id="pass" 
                  className="col-span-3" 
                  value={currentPartner.password || ''} 
                  onChange={(e) => setCurrentPartner({...currentPartner, password: e.target.value})}
                  placeholder="Senha de acesso"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pix" className="text-right">Chave PIX</Label>
                <Input 
                  id="pix" 
                  className="col-span-3" 
                  value={currentPartner.pix_key || ''} 
                  onChange={(e) => setCurrentPartner({...currentPartner, pix_key: e.target.value})}
                  placeholder="Chave para recebimento"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="whatsapp" className="text-right">WhatsApp</Label>
                <Input 
                  id="whatsapp" 
                  className="col-span-3" 
                  value={currentPartner.whatsapp || ''} 
                  onChange={(e) => setCurrentPartner({...currentPartner, whatsapp: e.target.value})}
                  placeholder="DDD + Número"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateOrUpdate} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Criar Parceiro'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Buscar parceiro..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parceiro</TableHead>
              <TableHead>Slug / Link</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && partners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredPartners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum parceiro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1 rounded">/promo/{partner.slug}</code>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(`${window.location.origin}/promo/${partner.slug}`, "Link de vendas")}>
                        <Copy size={12} />
                      </Button>
                      <a href={`/promo/${partner.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={12} className="text-primary" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{partner.email}</TableCell>
                  <TableCell>
                    <Badge variant={partner.status === 'active' ? 'default' : 'secondary'}>
                      {partner.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{partner.whatsapp || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Página de Vendas" onClick={() => window.open(`${window.location.origin}/promo/${partner.slug}`, '_blank')}>
                        <Globe size={16} className="text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Dashboard do Parceiro" onClick={() => window.open(`${window.location.origin}/dash/${partner.slug}`, '_blank')}>
                        <BarChart3 size={16} className="text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => {
                        setCurrentPartner(partner);
                        setIsEditing(true);
                        setIsCreateModalOpen(true);
                      }}>
                        <Edit size={16} className="text-amber-500" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDelete(partner.id)}>
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PartnersPanel;
