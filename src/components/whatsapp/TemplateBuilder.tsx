import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Send, Layout, Type, Image as ImageIcon, Video, FileText, MousePointer2, ExternalLink, Phone, Play, Zap, Upload, Loader2, File } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    
    // Header
    if (headerType !== 'NONE') {
      const header: any = { type: 'HEADER', format: headerType };
      if (headerType === 'TEXT') {
        header.text = headerText;
        // Check for variables in header
        const variables = headerText.match(/\{\{\d+\}\}/g);
        if (variables) {
          header.example = { header_text: [headerText.replace(/\{\{\d+\}\}/g, "Exemplo")] };
        }
      } else {
        header.example = { header_handle: [headerUrl || "https://example.com/image.png"] };
      }
      components.push(header);
    }
    
    // Body
    const body: any = { type: 'BODY', text: bodyText };
    const bodyVariables = bodyText.match(/\{\{\d+\}\}/g);
    if (bodyVariables) {
      body.example = { body_text: [bodyVariables.map(() => "Exemplo")] };
    }
    components.push(body);
    
    // Footer
    if (footerText) components.push({ type: 'FOOTER', text: footerText });
    
    // Buttons
    if (buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: buttons.map(b => {
          const btn: any = { type: b.type, text: b.text };
          if (b.type === 'URL') {
            btn.url = b.url || "https://example.com";
          }
          if (b.type === 'PHONE') {
            btn.phone_number = b.phone_number || "5511999999999";
          }
          return btn;
        })
      });
    }
    
    onSave({ name, category, language, components });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
      <div className="space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Layout className="w-5 h-5 text-primary" /> Configuração do Template</CardTitle>
            <CardDescription>Crie um template oficial para aprovação da Meta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTHENTICATION">
                      <div className="flex flex-col">
                        <span>Autenticação</span>
                        <span className="text-[10px] text-muted-foreground">Códigos de acesso, OTP</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="UTILITY">
                      <div className="flex flex-col">
                        <span>Utilidade</span>
                        <span className="text-[10px] text-muted-foreground">Pós-venda, Confirmações</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MARKETING">
                      <div className="flex flex-col">
                        <span>Marketing</span>
                        <span className="text-[10px] text-muted-foreground">Promoções, Ofertas</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label>Cabeçalho (Opcional)</Label>
              <div className="flex gap-2 flex-wrap">
                <Button variant={headerType === 'NONE' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('NONE')}>Nenhum</Button>
                <Button variant={headerType === 'TEXT' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('TEXT')}><Type className="w-4 h-4 mr-1" /> Texto</Button>
                <Button variant={headerType === 'IMAGE' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('IMAGE')}><ImageIcon className="w-4 h-4 mr-1" /> Imagem</Button>
              </div>
              {headerType === 'TEXT' && <Input placeholder="Texto do cabeçalho" value={headerText} onChange={e => setHeaderText(e.target.value)} maxLength={60} />}
              {headerType === 'IMAGE' && <Input placeholder="URL da imagem de exemplo" value={headerUrl} onChange={e => setHeaderUrl(e.target.value)} />}
            </div>
            <div className="space-y-2">
              <Label className="flex justify-between items-center">
                Corpo da Mensagem
                <span className={`text-[10px] ${bodyText.length > 1024 ? 'text-destructive' : 'text-muted-foreground'}`}>{bodyText.length}/1024</span>
              </Label>
              <Textarea placeholder="Olá {{1}}, tudo bem?" value={bodyText} onChange={e => setBodyText(e.target.value)} rows={5} className="resize-none font-mono text-sm" />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground">Use {"{{1}}"}, {"{{2}}"} para variáveis.</p>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setBodyText(prev => prev + '{{1}}')}>+ Adicionar Variável</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rodapé (Opcional)</Label>
              <Input placeholder="Texto curto no final" value={footerText} onChange={e => setFooterText(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Botões (Máx 3)</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addButton('QUICK_REPLY')} disabled={buttons.length >= 3}><MousePointer2 className="w-3 h-3 mr-1" /> Resposta</Button>
                  <Button variant="outline" size="sm" onClick={() => addButton('URL')} disabled={buttons.length >= 3}><ExternalLink className="w-3 h-3 mr-1" /> Link</Button>
                </div>
              </div>
              {buttons.map((btn, idx) => (
                <div key={idx} className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg border">
                  <div className="flex-1 space-y-2">
                    <Input placeholder="Texto do botão" value={btn.text} onChange={e => updateButton(idx, { text: e.target.value })} maxLength={25} />
                    {btn.type === 'URL' && <Input placeholder="https://..." value={btn.url} onChange={e => updateButton(idx, { url: e.target.value })} />}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeButton(idx)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={isSaving || !name || !bodyText}>{isSaving ? "Enviando..." : "Enviar para Aprovação"}<Send className="w-4 h-4 ml-2" /></Button>
          </CardContent>
        </Card>
      </div>
      <div className="sticky top-24 h-fit">
        <Label className="mb-2 block text-center font-bold text-muted-foreground uppercase text-xs">Prévia em Tempo Real</Label>
        <div className="bg-[#e5ddd5] dark:bg-zinc-950 rounded-3xl p-6 shadow-2xl border-[12px] border-zinc-800 relative overflow-hidden max-w-[360px] mx-auto min-h-[580px]">
          <div className="absolute top-0 left-0 right-0 h-14 bg-[#075e54] flex items-center px-4 gap-3 z-20">
            <div className="w-8 h-8 rounded-full bg-zinc-200/20 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold">Meta Business</div>
              <div className="text-white/70 text-[10px]">online</div>
            </div>
          </div>
          <div className="mt-16 space-y-1 relative z-10">
            <div className="bg-white dark:bg-zinc-900 rounded-lg rounded-tl-none shadow-md overflow-hidden border border-zinc-200/50 dark:border-zinc-800">
              {headerType !== 'NONE' && (
                <div className="p-0 border-b border-zinc-100 dark:border-zinc-800">
                  {headerType === 'TEXT' ? (
                    <div className="p-3 font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {headerText || "Título do Cabeçalho"}
                    </div>
                  ) : (
                    <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
                      {headerUrl ? (
                        <img src={headerUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-zinc-400" />
                      )}
                      <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                         <Play className="w-10 h-10 text-white/50" />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="p-3"><div className="text-[13px] whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{bodyText || "Mensagem..."}</div>{footerText && <div className="mt-1 text-[11px] text-zinc-500 uppercase">{footerText}</div>}</div>
              {buttons.map((btn, idx) => (<div key={idx} className="flex items-center justify-center p-2 border-t border-zinc-100 dark:border-zinc-700 text-blue-500 text-sm font-medium">{btn.type === 'URL' && <ExternalLink className="w-3 h-3 mr-2" />}{btn.text || "Botão"}</div>))}
            </div>
            <div className="flex justify-end"><span className="text-[10px] text-zinc-500">12:00</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateBuilder;
