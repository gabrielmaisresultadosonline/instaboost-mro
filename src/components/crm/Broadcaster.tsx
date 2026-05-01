import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  Send, 
  Users, 
  FileText, 
  GitBranch, 
  Play, 
  Pause, 
  Trash2, 
  Clock, 
  History, 
  HelpCircle, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  RefreshCcw,
  Plus,
  Upload,
  ArrowRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface BroadcasterProps {
  templates: any[];
  flows: any[];
  contacts: any[];
}

const Broadcaster = ({ templates, flows, contacts }: BroadcasterProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  
  // New campaign state
  const [name, setName] = useState('');
  const [type, setType] = useState<'message' | 'template' | 'flow'>('message');
  const [targetType, setTargetType] = useState<'contacts' | 'conversation' | 'uploaded'>('contacts');
  const [messageText, setMessageText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedFlow, setSelectedFlow] = useState('');
  const [uploadedNumbers, setUploadedNumbers] = useState('');
  const [delayMin, setDelayMin] = useState(10);
  const [delayMax, setDelayMax] = useState(60);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsingType, setParsingType] = useState<'vcard' | 'csv' | null>(null);

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    const { data } = await supabase
      .from('crm_broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    setBroadcasts(data || []);
  };

  const handleStartBroadcast = async () => {
    if (!name) {
      toast({ title: "Dê um nome à campanha", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let numbers: string[] = [];
      
      if (targetType === 'contacts') {
        numbers = contacts.map(c => c.wa_id);
      } else if (targetType === 'conversation') {
        // Assume contacts already filtered by last_interaction
        numbers = contacts.filter(c => c.last_interaction).map(c => c.wa_id);
      } else {
        // Parse uploaded numbers
        numbers = uploadedNumbers
          .split('\n')
          .map(n => n.trim().replace(/\D/g, ''))
          .filter(n => n.length >= 10);
      }

      if (numbers.length === 0) {
        toast({ title: "Nenhum número válido encontrado", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from('crm_broadcasts')
        .insert([{
          name,
          type,
          target_type: targetType,
          message_text: type === 'message' ? messageText : null,
          template_id: type === 'template' ? selectedTemplate : null,
          flow_id: type === 'flow' ? selectedFlow : null,
          random_delay_min: delayMin,
          random_delay_max: delayMax,
          total_contacts: numbers.length,
          uploaded_numbers: targetType === 'uploaded' ? numbers : null,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Campanha criada com sucesso!" });
      fetchBroadcasts();
      
      // Reset form
      setName('');
      setMessageText('');
      setUploadedNumbers('');
      
      // Here we would ideally trigger an edge function to process the queue
      // For now, let's just simulate the start
      await processBroadcast(data.id, numbers);

    } catch (err: any) {
      toast({ title: "Erro ao criar campanha", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const processBroadcast = async (broadcastId: string, numbers: string[]) => {
    // This is a simplified client-side processor
    // In a production app, this should be an Edge Function or Database Hook
    toast({ title: "Iniciando disparos...", description: `Total: ${numbers.length} números` });
    
    // Update status to running
    await supabase.from('crm_broadcasts').update({ status: 'running' }).eq('id', broadcastId);
    
    // We'll just update the DB records one by one in this simulation
    // In reality, you'd insert into crm_scheduled_messages
    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];
      
      // Wait random delay
      const delay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        // Send actual message
        const payload: any = { action: 'sendMessage', to: number };
        if (type === 'message') payload.text = messageText;
        else if (type === 'template') {
          const t = templates.find(temp => temp.id === selectedTemplate);
          payload.action = 'sendTemplate';
          payload.templateName = t?.name;
          payload.language = t?.language || 'pt_BR';
        } else if (type === 'flow') {
          // Find contact or create one
          const { data: contact } = await supabase.from('crm_contacts').select('id').eq('wa_id', number).maybeSingle();
          payload.action = 'startFlow';
          payload.flowId = selectedFlow;
          payload.waId = number;
          if (contact) payload.contactId = contact.id;
        }

        await supabase.functions.invoke('meta-whatsapp-crm', { body: payload });
        
        await supabase.from('crm_broadcasts')
          .update({ sent_count: i + 1 })
          .eq('id', broadcastId);
          
      } catch (err) {
        console.error("Error sending to", number, err);
        // Update failed count
        await (supabase.rpc as any)('increment_broadcast_failed', { b_id: broadcastId });
      }
    }
    
    await supabase.from('crm_broadcasts').update({ status: 'completed' }).eq('id', broadcastId);
    fetchBroadcasts();
    toast({ title: "Campanha finalizada!" });
  };

  const deleteBroadcast = async (id: string) => {
    if (!confirm('Deseja excluir este histórico?')) return;
    await supabase.from('crm_broadcasts').delete().eq('id', id);
    fetchBroadcasts();
  };

  const handleFileUpload = (type: 'vcard' | 'csv') => {
    setParsingType(type);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (parsingType === 'vcard') {
        // Extract numbers from VCard
        // Typical VCard entry: TEL;CELL;PREF:+55 11 99999-9999
        const telMatches = content.match(/TEL.*:([+\d\s\-()]+)/gi);
        if (telMatches) {
          const extracted = telMatches.map(m => {
            const num = m.split(':')[1].replace(/\D/g, '');
            return num;
          }).filter(n => n.length >= 10);
          setUploadedNumbers(prev => (prev ? prev + '\n' : '') + extracted.join('\n'));
          toast({ title: `${extracted.length} números extraídos do VCard` });
        }
      } else if (parsingType === 'csv') {
        // Simple CSV/Excel export parser (just look for long numbers)
        const lines = content.split('\n');
        const extracted: string[] = [];
        lines.forEach(line => {
          const matches = line.match(/\d{10,14}/g);
          if (matches) extracted.push(...matches);
        });
        setUploadedNumbers(prev => (prev ? prev + '\n' : '') + extracted.join('\n'));
        toast({ title: `${extracted.length} números extraídos do arquivo` });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 p-3 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111b21] p-6 rounded-2xl border border-white/5 shadow-2xl">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#e9edef]">Disparador de Mensagens</h2>
          <p className="text-[#8696a0] mt-1">Automação de disparos em massa profissional e segura.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-[#00a884]/10 text-[#00a884] border-[#00a884]/20 flex items-center gap-2">
            <Zap className="w-3 h-3" /> Modo Inteligente Ativo
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-2xl shadow-xl border border-border/50 overflow-hidden bg-card/40 backdrop-blur-sm">
            <CardHeader className="bg-[#075E54]/20 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2 text-[#25D366]">
                <Plus className="w-5 h-5" /> Nova Campanha
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input 
                    placeholder="Ex: Promoção de Verão" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-11 rounded-xl bg-muted/30 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destinatários</Label>
                  <Select value={targetType} onValueChange={(val: any) => setTargetType(val)}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-none">
                      <SelectValue placeholder="Selecione o público" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contacts">Todos os Contatos ({contacts.length})</SelectItem>
                      <SelectItem value="conversation">Pessoas que já conversaram</SelectItem>
                      <SelectItem value="uploaded">Subir Lista (VCard, Excel, Texto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {targetType === 'uploaded' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center">
                    <Label>Lista de Números (Um por linha)</Label>
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept={parsingType === 'vcard' ? '.vcf' : '.csv,.txt'} 
                        onChange={onFileChange} 
                      />
                      <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => handleFileUpload('vcard')}>
                        <Upload className="w-3 h-3 mr-1" /> VCard
                      </Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => handleFileUpload('csv')}>
                        <FileText className="w-3 h-3 mr-1" /> Excel/CSV
                      </Button>
                    </div>
                  </div>
                  <Textarea 
                    placeholder="5511999999999&#10;5521888888888"
                    className="min-h-[120px] rounded-xl bg-muted/30 border-none resize-none font-mono text-sm"
                    value={uploadedNumbers}
                    onChange={e => setUploadedNumbers(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground italic">Dica: Adicione o código do país (Ex: 55 para Brasil).</p>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Conteúdo do Disparo</Label>
                <Tabs value={type} onValueChange={(val: any) => setType(val)} className="w-full">
                  <TabsList className="grid grid-cols-3 h-12 bg-muted/40 rounded-xl p-1">
                    <TabsTrigger value="message" className="rounded-lg data-[state=active]:bg-[#075E54] data-[state=active]:text-white">Mensagem</TabsTrigger>
                    <TabsTrigger value="template" className="rounded-lg data-[state=active]:bg-[#075E54] data-[state=active]:text-white">Template</TabsTrigger>
                    <TabsTrigger value="flow" className="rounded-lg data-[state=active]:bg-[#075E54] data-[state=active]:text-white">Fluxo</TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-6">
                    <TabsContent value="message" className="space-y-2 animate-in fade-in">
                      <Label>Texto da Mensagem</Label>
                      <Textarea 
                        placeholder="Escreva sua mensagem aqui..."
                        className="min-h-[150px] rounded-xl bg-muted/30 border-none resize-none"
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                      />
                    </TabsContent>

                    <TabsContent value="template" className="space-y-4 animate-in fade-in">
                      <Label>Selecione o Template Aprovado</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {templates.filter(t => t.status === 'APPROVED').map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => setSelectedTemplate(t.id)}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all cursor-pointer",
                              selectedTemplate === t.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:border-muted-foreground/20"
                            )}
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-xs truncate">{t.name}</span>
                              <Badge variant="secondary" className="text-[9px]">{t.category}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2">
                              {t.components?.find((c: any) => c.type === 'BODY')?.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="flow" className="space-y-4 animate-in fade-in">
                      <Label>Selecione o Fluxo Visual</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {flows.map(f => (
                          <div 
                            key={f.id} 
                            onClick={() => setSelectedFlow(f.id)}
                            className={cn(
                              "p-4 rounded-xl border-2 transition-all cursor-pointer",
                              selectedFlow === f.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:border-muted-foreground/20"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <GitBranch className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-xs">{f.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Configurações de Tempo Randomizado
                  </Label>
                  <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-500/5">Evita Bloqueios</Badge>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px]">Intervalo Mínimo (segundos)</Label>
                    <Input 
                      type="number" 
                      value={delayMin}
                      onChange={e => setDelayMin(parseInt(e.target.value))}
                      className="h-10 rounded-xl bg-muted/30 border-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px]">Intervalo Máximo (segundos)</Label>
                    <Input 
                      type="number" 
                      value={delayMax}
                      onChange={e => setDelayMax(parseInt(e.target.value))}
                      className="h-10 rounded-xl bg-muted/30 border-none"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleStartBroadcast}
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-zinc-950 font-black text-lg shadow-xl shadow-[#25D366]/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-3"
              >
                {loading ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6" />}
                INICIAR DISPARO EM MASSA
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-2xl shadow-xl border border-border/50 overflow-hidden bg-card/40 backdrop-blur-sm">
            <CardHeader className="bg-[#075E54]/20 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2 text-[#25D366]">
                <History className="w-5 h-5" /> Histórico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {broadcasts.map(b => (
                    <div key={b.id} className="p-3 rounded-xl border bg-card hover:shadow-md transition-shadow relative group">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-xs truncate pr-4">{b.name}</span>
                        <Badge className={cn(
                          "text-[8px] px-1.5 py-0.5",
                          b.status === 'completed' ? "bg-green-500" : 
                          b.status === 'running' ? "bg-blue-500 animate-pulse" : "bg-zinc-500"
                        )}>
                          {b.status === 'completed' ? 'Finalizado' : b.status === 'running' ? 'Em curso' : 'Pendente'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" /> {b.sent_count}/{b.total_contacts} enviados
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {new Date(b.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteBroadcast(b.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            b.status === 'completed' ? "bg-green-500" : "bg-primary"
                          )} 
                          style={{ width: `${(b.sent_count / b.total_contacts) * 100}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                  {broadcasts.length === 0 && (
                    <div className="py-10 text-center text-muted-foreground text-sm italic">
                      Nenhuma campanha recente.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-xl border border-border/50 overflow-hidden bg-gradient-to-br from-[#075E54]/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-[#25D366]">
                <Users className="w-4 h-4" /> Remarketing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div 
                className="p-3 rounded-lg border bg-white/50 hover:border-primary/50 cursor-pointer transition-all"
                onClick={() => setTargetType('conversation')}
              >
                <p className="text-[11px] font-bold">Recuperar Ociosos</p>
                <p className="text-[10px] text-muted-foreground">Pessoas que já conversaram mas não fecharam.</p>
              </div>
              <div 
                className="p-3 rounded-lg border bg-white/50 hover:border-primary/50 cursor-pointer transition-all"
                onClick={() => {
                  setTargetType('contacts');
                  // Filter logic could be added here if we had more metadata
                }}
              >
                <p className="text-[11px] font-bold">Base de Leads</p>
                <p className="text-[10px] text-muted-foreground">Toda a sua lista de contatos do CRM.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-xl border border-border/50 overflow-hidden bg-gradient-to-br from-[#075E54]/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-[#25D366]">
                <HelpCircle className="w-4 h-4" /> Tutorial Rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#25D366] text-zinc-950 flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                  <p className="text-[11px] leading-relaxed">Escolha um <strong>Nome</strong> e o <strong>Público-alvo</strong>. Você pode subir uma lista colando números.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#25D366] text-zinc-950 flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                  <p className="text-[11px] leading-relaxed">Selecione o <strong>Conteúdo</strong>. Templates oficiais são mais seguros contra bloqueios.</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#25D366] text-zinc-950 flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
                  <p className="text-[11px] leading-relaxed">Ajuste o <strong>Tempo Randomizado</strong>. Recomendamos pelo menos 15-30 segundos entre mensagens.</p>
                </div>
                <div className="flex gap-3 border-t pt-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                  <p className="text-[11px] leading-relaxed font-bold text-green-700">O status "running" indica que o sistema está disparando em segundo plano.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Broadcaster;
