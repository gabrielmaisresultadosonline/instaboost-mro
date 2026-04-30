import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Save, 
  Plus, 
  MessageSquare, 
  Mic, 
  Video, 
  ImageIcon,
  Clock, 
  HelpCircle, 
  ArrowRight,
  Trash2,
  X,
  Zap,
  AlertCircle,
  Upload,
  UserCheck,
  Timer
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Custom Node Types
const MessageNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-blue-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-blue-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <MessageSquare className="w-3 h-3" /> Mensagem de Texto
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] text-muted-foreground line-clamp-2">{data.text || 'Sem texto...'}</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const AudioNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-purple-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-purple-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <Mic className="w-3 h-3" /> Áudio {data.isPTT && <Badge variant="secondary" className="bg-white/20 text-white border-none text-[8px] h-4">Gravado</Badge>}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] text-muted-foreground truncate">{data.fileName || data.audioUrl || 'Nenhum áudio selecionado'}</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const VideoNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-orange-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-orange-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <Video className="w-3 h-3" /> Vídeo
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] text-muted-foreground truncate">{data.fileName || data.videoUrl || 'Nenhum vídeo selecionado'}</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const ImageNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-emerald-400 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-emerald-400 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <ImageIcon className="w-3 h-3" /> Imagem
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      {data.imageUrl ? (
        <div className="aspect-video w-full rounded bg-slate-100 flex items-center justify-center overflow-hidden">
          <img src={data.imageUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground truncate">{data.fileName || 'Nenhuma imagem selecionada'}</p>
      )}
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const WaitResponseNode = ({ data }: any) => (
  <Card className="min-w-[220px] border-indigo-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-indigo-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <UserCheck className="w-3 h-3" /> Aguardar Resposta
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 space-y-3">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Se responder:</span>
        <Handle type="source" position={Position.Bottom} id="responded" style={{ left: '30%', bottom: '-8px' }} />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Se não responder ({data.timeout || 20}m):</span>
        <Handle type="source" position={Position.Bottom} id="timeout" style={{ left: '70%', bottom: '-8px' }} />
      </div>
    </CardContent>
  </Card>
);

const DelayNode = ({ data }: any) => (
  <Card className="min-w-[150px] border-amber-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-amber-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <Clock className="w-3 h-3" /> Aguardar
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] font-bold">{data.delay || 5} {data.unit || 'segundos'}</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const QuestionNode = ({ data }: any) => (
  <Card className="min-w-[250px] border-emerald-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-emerald-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <HelpCircle className="w-3 h-3" /> Pergunta com Botões
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 space-y-2">
      <p className="text-[10px] text-muted-foreground line-clamp-1">{data.text || 'Qual a sua dúvida?'}</p>
      <div className="flex flex-wrap gap-1">
        {(data.buttons || []).map((btn: any, idx: number) => (
          <div key={idx} className="relative group">
            <div className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-200">
              {btn.text}
            </div>
            <Handle 
              type="source" 
              position={Position.Bottom} 
              id={`btn-${idx}`} 
              style={{ left: `${(idx + 1) * (100 / ((data.buttons?.length || 0) + 1))}%` }}
            />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const FollowUpNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-red-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-red-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <AlertCircle className="w-3 h-3" /> Lembrete (Sem Resposta)
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] text-muted-foreground">Se não responder em {data.timeout || 20} min</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const CRMActionNode = ({ data }: any) => (
  <Card className="min-w-[180px] border-slate-700 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-slate-700 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <Zap className="w-3 h-3" /> Ação CRM
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] font-bold text-slate-600">{data.action || 'Notificar Agente'}</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const nodeTypes = {
  message: MessageNode,
  audio: AudioNode,
  video: VideoNode,
  image: ImageNode,
  delay: DelayNode,
  question: QuestionNode,
  followup: FollowUpNode,
  waitResponse: WaitResponseNode,
  crmAction: CRMActionNode,
};

interface FlowEditorProps {
  flow: any;
  onSave: (flow: any) => void;
  onClose: () => void;
}

const FlowEditor: React.FC<FlowEditorProps> = ({ flow, onSave, onClose }) => {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState(flow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow?.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowName, setFlowName] = useState(flow?.name || 'Novo Fluxo');
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File, nodeId: string, type: 'audio' | 'video' | 'image') => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `flow-media/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('crm-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('crm-media')
        .getPublicUrl(filePath);

      const updateData: any = { fileName: file.name };
      if (type === 'audio') updateData.audioUrl = publicUrl;
      if (type === 'video') updateData.videoUrl = publicUrl;
      if (type === 'image') updateData.imageUrl = publicUrl;

      updateNodeData(nodeId, updateData);
      toast({ title: "Arquivo enviado com sucesso!" });
    } catch (error: any) {
      toast({ 
        title: "Erro no upload", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addNode = (type: string) => {
    const id = `${type}_${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        text: type === 'message' ? 'Olá, como posso ajudar?' : '',
        buttons: type === 'question' ? [{ text: 'Sim' }, { text: 'Não' }] : [],
        delay: 5,
        unit: 'segundos',
        timeout: 20,
        isPTT: type === 'audio',
        fileName: '',
        action: type === 'crmAction' ? 'Notificar Agente' : ''
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev: any) => ({ ...prev, data: { ...prev.data, ...newData } }));
    }
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const handleSave = () => {
    onSave({
      ...flow,
      name: flowName,
      nodes,
      edges,
    });
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <header className="border-b p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          <div className="space-y-1">
            <Input 
              value={flowName} 
              onChange={(e) => setFlowName(e.target.value)}
              className="font-bold border-none h-auto p-0 focus-visible:ring-0 text-lg"
            />
            <p className="text-xs text-muted-foreground">Editor de Fluxo Visual</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5 mr-4">
            <Zap className="w-3 h-3 mr-1" /> Mensagens após 24h serão Marketing (Pago)
          </Badge>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-2" /> Salvar Fluxo
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r bg-card/50 p-4 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Adicionar Blocos</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start gap-2 border-blue-500/20 hover:bg-blue-500/10" onClick={() => addNode('message')}>
                <MessageSquare className="w-4 h-4 text-blue-500" /> Texto
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-emerald-500/20 hover:bg-emerald-500/10" onClick={() => addNode('question')}>
                <HelpCircle className="w-4 h-4 text-emerald-500" /> Pergunta/Botões
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-purple-500/20 hover:bg-purple-500/10" onClick={() => addNode('audio')}>
                <Mic className="w-4 h-4 text-purple-500" /> Áudio
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-orange-500/20 hover:bg-orange-500/10" onClick={() => addNode('video')}>
                <Video className="w-4 h-4 text-orange-500" /> Vídeo
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-emerald-400/20 hover:bg-emerald-400/10" onClick={() => addNode('image')}>
                <ImageIcon className="w-4 h-4 text-emerald-400" /> Imagem
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-amber-500/20 hover:bg-amber-500/10" onClick={() => addNode('delay')}>
                <Clock className="w-4 h-4 text-amber-500" /> Delay
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-indigo-500/20 hover:bg-indigo-500/10" onClick={() => addNode('waitResponse')}>
                <UserCheck className="w-4 h-4 text-indigo-500" /> Aguardar Resposta
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-red-500/20 hover:bg-red-500/10" onClick={() => addNode('followup')}>
                <AlertCircle className="w-4 h-4 text-red-500" /> Lembrete
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-slate-700/20 hover:bg-slate-700/10" onClick={() => addNode('crmAction')}>
                <Zap className="w-4 h-4 text-slate-700" /> Ação CRM
              </Button>
            </div>
          </div>

          {selectedNode && (
            <div className="pt-6 border-t animate-in fade-in slide-in-from-right-4 pb-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Configurar Bloco</h3>
                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteNode(selectedNode.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {(selectedNode.type === 'message' || selectedNode.type === 'question') && (
                  <div className="space-y-2">
                    <Label className="text-xs">Texto da Mensagem</Label>
                    <Textarea 
                      value={selectedNode.data.text as string} 
                      onChange={(e) => updateNodeData(selectedNode.id, { text: e.target.value })}
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                )}

                {selectedNode.type === 'question' && (
                  <div className="space-y-3">
                    <Label className="text-xs">Botões (Máx 3)</Label>
                    {(selectedNode.data.buttons as any[]).map((btn, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input 
                          value={btn.text} 
                          onChange={(e) => {
                            const newButtons = [...(selectedNode.data.buttons as any[])];
                            newButtons[idx].text = e.target.value;
                            updateNodeData(selectedNode.id, { buttons: newButtons });
                          }}
                          className="text-xs h-8"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-400"
                          onClick={() => {
                            const newButtons = (selectedNode.data.buttons as any[]).filter((_, i) => i !== idx);
                            updateNodeData(selectedNode.id, { buttons: newButtons });
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {(selectedNode.data.buttons as any[]).length < 3 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs h-8" 
                        onClick={() => {
                          const newButtons = [...(selectedNode.data.buttons as any[]), { text: 'Novo Botão' }];
                          updateNodeData(selectedNode.id, { buttons: newButtons });
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Botão
                      </Button>
                    )}
                  </div>
                )}

                {selectedNode.type === 'audio' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Upload de Áudio (.mp3, .ogg)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="file" 
                        accept=".mp3,.ogg"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, selectedNode.id, 'audio');
                        }}
                        className="text-xs h-8"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                    </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-bold text-purple-700">Gravado na hora</Label>
                        <p className="text-[9px] text-purple-600/70">Aparecerá como "gravando..."</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={selectedNode.data.isPTT as boolean}
                        onChange={(e) => updateNodeData(selectedNode.id, { isPTT: e.target.checked })}
                        className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'video' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Upload de Vídeo (.mp4)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="file" 
                        accept=".mp4"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, selectedNode.id, 'video');
                        }}
                        className="text-xs h-8"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                    </div>
                  </div>
                )}

                {selectedNode.type === 'image' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Upload de Imagem (.jpg, .png)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="file" 
                        accept="image/*"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, selectedNode.id, 'image');
                        }}
                        className="text-xs h-8"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                    </div>
                  </div>
                )}

                {selectedNode.type === 'waitResponse' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Tempo máximo de espera (minutos)</Label>
                      <Input 
                        type="number" 
                        value={selectedNode.data.timeout as number} 
                        onChange={(e) => updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="p-2 bg-indigo-50 rounded border border-indigo-100 space-y-2">
                      <p className="text-[10px] text-indigo-700 font-medium flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" /> Como funciona?
                      </p>
                      <p className="text-[9px] text-indigo-600/80">
                        O fluxo para aqui. Se o cliente enviar qualquer mensagem, ele segue pela saída da esquerda. Se passar o tempo configurado, segue pela saída da direita (Follow-up).
                      </p>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'delay' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Tempo</Label>
                      <Input 
                        type="number" 
                        value={selectedNode.data.delay as number} 
                        onChange={(e) => updateNodeData(selectedNode.id, { delay: parseInt(e.target.value) })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Unidade</Label>
                      <Select 
                        value={selectedNode.data.unit as string} 
                        onValueChange={(val) => updateNodeData(selectedNode.id, { unit: val })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="segundos">Segundos</SelectItem>
                          <SelectItem value="minutos">Minutos</SelectItem>
                          <SelectItem value="horas">Horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'followup' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Tempo sem resposta (min)</Label>
                    <Input 
                      type="number" 
                      value={selectedNode.data.timeout as number} 
                      onChange={(e) => updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) })}
                      className="text-xs h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">O fluxo continuará deste nó se o cliente não responder.</p>
                  </div>
                )}
                {selectedNode.type === 'crmAction' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de Ação</Label>
                    <Select 
                      value={selectedNode.data.action as string} 
                      onValueChange={(val) => updateNodeData(selectedNode.id, { action: val })}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Notificar Agente">Notificar Agente</SelectItem>
                        <SelectItem value="Mudar Status: Ganho">Mudar Status: Ganho</SelectItem>
                        <SelectItem value="Mudar Status: Perdido">Mudar Status: Perdido</SelectItem>
                        <SelectItem value="Adicionar Etiqueta">Adicionar Etiqueta</SelectItem>
                        <SelectItem value="Solicitar Ligação">Solicitar Ligação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 relative bg-slate-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNode(node)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="top-right">
              <div className="bg-card p-2 border rounded shadow-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-medium">Fluxo Ativo</span>
              </div>
            </Panel>
          </ReactFlow>
        </main>
      </div>
    </div>
  );
};

export default FlowEditor;
