import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Send, Layout, Type, Image as ImageIcon, Video, FileText, MousePointer2, ExternalLink, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplateBuilderProps {
  onSave: (template: any) => void;
  isSaving?: boolean;
}

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ onSave, isSaving }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('pt_BR');
  const [headerType, setHeaderType] = useState('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerUrl, setHeaderUrl] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<any[]>([]);

  const addButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE') => {
    if (buttons.length >= 3) return;
    if (type !== 'QUICK_REPLY' && buttons.some(b => b.type === 'QUICK_REPLY')) return;
    if (type === 'QUICK_REPLY' && buttons.some(b => b.type !== 'QUICK_REPLY')) return;

    const newButton = {
      type,
      text: '',
      url: type === 'URL' ? '' : undefined,
      phone_number: type === 'PHONE' ? '' : undefined
    };
    setButtons([...buttons, newButton]);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, updates: any) => {
    setButtons(buttons.map((b, i) => i === index ? { ...b, ...updates } : b));
  };

  const handleSubmit = () => {
    const components: any[] = [];

    if (headerType !== 'NONE') {
      const header: any = { type: 'HEADER', format: headerType };
      if (headerType === 'TEXT') header.text = headerText;
      else header.example = { header_handle: [headerUrl] };
      components.push(header);
    }

    components.push({ type: 'BODY', text: bodyText });

    if (footerText) {
      components.push({ type: 'FOOTER', text: footerText });
    }

    if (buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: buttons.map(b => {
          const btn: any = { type: b.type, text: b.text };
          if (b.type === 'URL') btn.url = b.url;
          if (b.type === 'PHONE') btn.phone_number = b.phone_number;
          return btn;
        })
      });
    }

    onSave({ name, category, language, components });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
      {/* Configuration Side */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layout className="w-5 h-5" /> Configuração do Template
            </CardTitle>
            <CardDescription>Crie um template oficial para aprovação da Meta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input 
                  placeholder="ex: boas_vindas_v1" 
                  value={name} 
                  onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utilidade</SelectItem>
                    <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cabeçalho (Opcional)</Label>
              <div className="flex gap-2 flex-wrap">
                <Button variant={headerType === 'NONE' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('NONE')}>Nenhum</Button>
                <Button variant={headerType === 'TEXT' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('TEXT')}><Type className="w-4 h-4 mr-1" /> Texto</Button>
                <Button variant={headerType === 'IMAGE' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('IMAGE')}><ImageIcon className="w-4 h-4 mr-1" /> Imagem</Button>
                <Button variant={headerType === 'VIDEO' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('VIDEO')}><Video className="w-4 h-4 mr-1" /> Vídeo</Button>
                <Button variant={headerType === 'DOCUMENT' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('DOCUMENT')}><FileText className="w-4 h-4 mr-1" /> Doc</Button>
              </div>
              {headerType === 'TEXT' && (
                <Input placeholder="Texto do cabeçalho" value={headerText} onChange={e => setHeaderText(e.target.value)} maxLength={60} />
              )}
              {(headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') && (
                <Input placeholder="URL da mídia de exemplo" value={headerUrl} onChange={e => setHeaderUrl(e.target.value)} />
              )}
            </div>

            <div className="space-y-2">
              <Label>Corpo da Mensagem</Label>
              <Textarea 
                placeholder="Olá {{1}}, tudo bem?" 
                value={bodyText} 
                onChange={e => setBodyText(e.target.value)} 
                rows={5}
                className="resize-none"
              />
              <p className="text-[10px] text-muted-foreground">Use {"{{1}}"}, {"{{2}}"} para variáveis que serão preenchidas ao enviar.</p>
            </div>

            <div className="space-y-2">
              <Label>Rodapé (Opcional)</Label>
              <Input placeholder="Texto curto no final" value={footerText} onChange={e => setFooterText(e.target.value)} maxLength={60} />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Botões (Máx 3)</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="xs" onClick={() => addButton('QUICK_REPLY')} disabled={buttons.length >= 3}><MousePointer2 className="w-3 h-3 mr-1" /> Resposta</Button>
                  <Button variant="outline" size="xs" onClick={() => addButton('URL')} disabled={buttons.length >= 3}><ExternalLink className="w-3 h-3 mr-1" /> Link</Button>
                  <Button variant="outline" size="xs" onClick={() => addButton('PHONE')} disabled={buttons.length >= 3}><Phone className="w-3 h-3 mr-1" /> Fone</Button>
                </div>
              </div>
              
              {buttons.map((btn, idx) => (
                <div key={idx} className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg border">
                  <div className="flex-1 space-y-2">
                    <Input 
                      placeholder="Texto do botão" 
                      value={btn.text} 
                      onChange={e => updateButton(idx, { text: e.target.value })} 
                      maxLength={25}
                    />
                    {btn.type === 'URL' && (
                      <Input placeholder="https://..." value={btn.url} onChange={e => updateButton(idx, { url: e.target.value })} />
                    )}
                    {btn.type === 'PHONE' && (
                      <Input placeholder="+55..." value={btn.phone_number} onChange={e => updateButton(idx, { phone_number: e.target.value })} />
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeButton(idx)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={isSaving || !name || !bodyText}>
              {isSaving ? "Enviando..." : "Enviar para Aprovação"}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview Side */}
      <div className="sticky top-24 h-fit">
        <Label className="mb-2 block text-center font-bold text-muted-foreground uppercase text-xs">Prévia em Tempo Real</Label>
        <div className="bg-[#e5ddd5] dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border-8 border-zinc-800 relative overflow-hidden max-w-[360px] mx-auto min-h-[500px]">
          <div className="absolute top-0 left-0 right-0 h-12 bg-zinc-800 flex items-center px-4 gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-white" /></div>
            <div className="text-white text-sm font-medium">Meta Business</div>
          </div>
          
          <div className="mt-14 space-y-1">
            <div className="bg-white dark:bg-zinc-800 rounded-lg rounded-tl-none shadow-sm overflow-hidden border border-zinc-200/50 dark:border-zinc-700">
              {headerType !== 'NONE' && (
                <div className="p-0 border-b border-zinc-100 dark:border-zinc-700">
                  {headerType === 'TEXT' ? (
                    <div className="p-3 font-bold text-sm text-zinc-900 dark:text-zinc-100">{headerText || "Texto do cabeçalho"}</div>
                  ) : (
                    <div className="aspect-video bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                      {headerType === 'IMAGE' && <ImageIcon className="w-8 h-8 text-zinc-400" />}
                      {headerType === 'VIDEO' && <Video className="w-8 h-8 text-zinc-400" />}
                      {headerType === 'DOCUMENT' && <FileText className="w-8 h-8 text-zinc-400" />}
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-3">
                <div className="text-[13px] whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                  {bodyText || "Seu conteúdo aparecerá aqui..."}
                </div>
                {footerText && (
                  <div className="mt-1 text-[11px] text-zinc-500 uppercase">{footerText}</div>
                )}
              </div>

              {buttons.length > 0 && (
                <div className="border-t border-zinc-100 dark:border-zinc-700">
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="flex items-center justify-center p-2 border-b last:border-0 border-zinc-100 dark:border-zinc-700 text-blue-500 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                      {btn.type === 'URL' && <ExternalLink className="w-3 h-3 mr-2" />}
                      {btn.type === 'PHONE' && <Phone className="w-3 h-3 mr-2" />}
                      {btn.text || "Botão"}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <span className="text-[10px] text-zinc-500 bg-white/50 dark:bg-zinc-800/50 px-1 rounded">12:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateBuilder;
