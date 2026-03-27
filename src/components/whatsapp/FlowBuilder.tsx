import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Trash2, GripVertical, MessageSquare, Image, Mic, Video,
  Clock, Type, MousePointer, Loader2, ChevronDown, ChevronUp,
  Zap, PauseCircle, Play, Save, ArrowRight, Settings2, ToggleLeft, ToggleRight
} from 'lucide-react';

interface FlowStep {
  id?: string;
  step_order: number;
  step_type: 'text' | 'image' | 'audio' | 'video' | 'buttons' | 'wait_reply';
  content?: string;
  media_url?: string;
  delay_seconds: number;
  simulate_typing: boolean;
  typing_duration_ms: number;
  wait_for_reply: boolean;
  wait_timeout_seconds: number;
  button_text?: string;
  button_options: string[];
}

interface Flow {
  id?: string;
  name: string;
  description?: string;
  trigger_type: 'manual' | 'keyword' | 'first_message';
  trigger_keywords: string[];
  trigger_on_first_message: boolean;
  trigger_specific_text?: string;
  is_active: boolean;
  steps: FlowStep[];
}

interface FlowBuilderProps {
  callProxy: (action: string, data?: Record<string, unknown>) => Promise<any>;
  onFlowsChange?: () => void;
}

const STEP_TYPES = [
  { value: 'text', label: 'Texto', icon: Type, color: '#00a884' },
  { value: 'image', label: 'Imagem', icon: Image, color: '#7c5cfc' },
  { value: 'audio', label: 'Áudio', icon: Mic, color: '#e67e22' },
  { value: 'video', label: 'Vídeo', icon: Video, color: '#e74c3c' },
  { value: 'buttons', label: 'Botões', icon: MousePointer, color: '#3498db' },
  { value: 'wait_reply', label: 'Aguardar Resposta', icon: PauseCircle, color: '#f39c12' },
];

const emptyStep = (): FlowStep => ({
  step_order: 0,
  step_type: 'text',
  content: '',
  delay_seconds: 2,
  simulate_typing: true,
  typing_duration_ms: 3000,
  wait_for_reply: false,
  wait_timeout_seconds: 300,
  button_options: [],
});

export default function FlowBuilder({ callProxy, onFlowsChange }: FlowBuilderProps) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [newKeyword, setNewKeyword] = useState('');

  const loadFlows = async () => {
    setLoading(true);
    try {
      const result = await callProxy('get-flows');
      setFlows(Array.isArray(result.flows) ? result.flows : []);
    } catch (e) {
      console.error('Error loading flows:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFlows(); }, []);

  const createNewFlow = () => {
    const flow: Flow = {
      name: 'Novo Fluxo',
      trigger_type: 'manual',
      trigger_keywords: [],
      trigger_on_first_message: false,
      is_active: true,
      steps: [emptyStep()],
    };
    setSelectedFlow(flow);
    setExpandedStep(0);
  };

  const saveFlow = async () => {
    if (!selectedFlow) return;
    if (!selectedFlow.name.trim()) {
      toast({ title: 'Nome do fluxo é obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await callProxy('save-flow', {
        flow: {
          id: selectedFlow.id,
          name: selectedFlow.name,
          description: selectedFlow.description,
          trigger_type: selectedFlow.trigger_type,
          trigger_keywords: selectedFlow.trigger_keywords,
          trigger_on_first_message: selectedFlow.trigger_on_first_message,
          trigger_specific_text: selectedFlow.trigger_specific_text,
          is_active: selectedFlow.is_active,
        },
        steps: selectedFlow.steps.map((s, i) => ({ ...s, step_order: i })),
      });
      toast({ title: 'Fluxo salvo com sucesso!' });
      await loadFlows();
      onFlowsChange?.();
    } catch (e) {
      toast({ title: 'Erro ao salvar fluxo', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteFlow = async (flowId: string) => {
    try {
      await callProxy('delete-flow', { flowId });
      toast({ title: 'Fluxo removido!' });
      if (selectedFlow?.id === flowId) setSelectedFlow(null);
      await loadFlows();
      onFlowsChange?.();
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const addStep = (type: FlowStep['step_type']) => {
    if (!selectedFlow) return;
    const step = { ...emptyStep(), step_type: type, step_order: selectedFlow.steps.length };
    if (type === 'wait_reply') {
      step.wait_for_reply = true;
      step.simulate_typing = false;
    }
    const updated = { ...selectedFlow, steps: [...selectedFlow.steps, step] };
    setSelectedFlow(updated);
    setExpandedStep(updated.steps.length - 1);
  };

  const removeStep = (index: number) => {
    if (!selectedFlow) return;
    const steps = selectedFlow.steps.filter((_, i) => i !== index);
    setSelectedFlow({ ...selectedFlow, steps });
    setExpandedStep(null);
  };

  const updateStep = (index: number, updates: Partial<FlowStep>) => {
    if (!selectedFlow) return;
    const steps = [...selectedFlow.steps];
    steps[index] = { ...steps[index], ...updates };
    setSelectedFlow({ ...selectedFlow, steps });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (!selectedFlow) return;
    const steps = [...selectedFlow.steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    setSelectedFlow({ ...selectedFlow, steps });
    setExpandedStep(newIndex);
  };

  const addKeyword = () => {
    if (!selectedFlow || !newKeyword.trim()) return;
    setSelectedFlow({
      ...selectedFlow,
      trigger_keywords: [...selectedFlow.trigger_keywords, newKeyword.trim()],
    });
    setNewKeyword('');
  };

  const removeKeyword = (index: number) => {
    if (!selectedFlow) return;
    setSelectedFlow({
      ...selectedFlow,
      trigger_keywords: selectedFlow.trigger_keywords.filter((_, i) => i !== index),
    });
  };

  const addButtonOption = (stepIndex: number) => {
    if (!selectedFlow) return;
    const step = selectedFlow.steps[stepIndex];
    updateStep(stepIndex, { button_options: [...step.button_options, ''] });
  };

  const updateButtonOption = (stepIndex: number, optIndex: number, value: string) => {
    if (!selectedFlow) return;
    const opts = [...selectedFlow.steps[stepIndex].button_options];
    opts[optIndex] = value;
    updateStep(stepIndex, { button_options: opts });
  };

  const removeButtonOption = (stepIndex: number, optIndex: number) => {
    if (!selectedFlow) return;
    const opts = selectedFlow.steps[stepIndex].button_options.filter((_, i) => i !== optIndex);
    updateStep(stepIndex, { button_options: opts });
  };

  if (selectedFlow) {
    return (
      <div className="h-full flex flex-col bg-[#111b21]">
        {/* Header */}
        <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedFlow(null)} className="text-white/60 hover:text-white hover:bg-white/10">
              ← Voltar
            </Button>
            <Zap className="w-5 h-5 text-[#00a884]" />
            <span className="text-white font-semibold text-sm">Editor de Fluxo</span>
          </div>
          <Button onClick={saveFlow} disabled={saving} className="bg-[#00a884] hover:bg-[#00a884]/80 text-white text-sm h-9">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Salvar
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4 max-w-3xl mx-auto">
            {/* Flow Info */}
            <div className="bg-[#202c33] rounded-xl p-4 space-y-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className="w-4 h-4 text-[#00a884]" />
                <span className="text-white/80 text-sm font-semibold">Configurações do Fluxo</span>
              </div>
              <Input
                value={selectedFlow.name}
                onChange={(e) => setSelectedFlow({ ...selectedFlow, name: e.target.value })}
                placeholder="Nome do fluxo"
                className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30"
              />
              <Textarea
                value={selectedFlow.description || ''}
                onChange={(e) => setSelectedFlow({ ...selectedFlow, description: e.target.value })}
                placeholder="Descrição (opcional)"
                className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30 resize-none"
                rows={2}
              />

              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Ativo</span>
                <button onClick={() => setSelectedFlow({ ...selectedFlow, is_active: !selectedFlow.is_active })}>
                  {selectedFlow.is_active
                    ? <ToggleRight className="w-8 h-8 text-[#00a884]" />
                    : <ToggleLeft className="w-8 h-8 text-white/30" />
                  }
                </button>
              </div>
            </div>

            {/* Trigger Config */}
            <div className="bg-[#202c33] rounded-xl p-4 space-y-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-white/80 text-sm font-semibold">Gatilho</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'manual', label: 'Manual' },
                  { value: 'keyword', label: 'Palavra-chave' },
                  { value: 'first_message', label: '1ª Mensagem' },
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedFlow({ ...selectedFlow, trigger_type: t.value as Flow['trigger_type'] })}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      selectedFlow.trigger_type === t.value
                        ? 'bg-[#00a884] text-white'
                        : 'bg-[#2a3942] text-white/50 hover:text-white/80'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {selectedFlow.trigger_type === 'keyword' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Adicionar palavra-chave"
                      className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    />
                    <Button onClick={addKeyword} size="sm" className="bg-[#00a884] hover:bg-[#00a884]/80 text-white">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedFlow.trigger_keywords.map((kw, i) => (
                      <span key={i} className="bg-[#00a884]/20 text-[#00a884] px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        {kw}
                        <button onClick={() => removeKeyword(i)} className="hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label className="text-white/50 text-xs">Responder na mensagem específica?</label>
                    <Input
                      value={selectedFlow.trigger_specific_text || ''}
                      onChange={(e) => setSelectedFlow({ ...selectedFlow, trigger_specific_text: e.target.value })}
                      placeholder="Texto específico (deixe vazio para qualquer)"
                      className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-sm font-semibold">Passos do Fluxo ({selectedFlow.steps.length})</span>
              </div>

              {selectedFlow.steps.map((step, index) => {
                const stepType = STEP_TYPES.find(s => s.value === step.step_type);
                const Icon = stepType?.icon || Type;
                const isExpanded = expandedStep === index;

                return (
                  <div key={index} className="bg-[#202c33] rounded-xl border border-white/5 overflow-hidden">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5"
                      onClick={() => setExpandedStep(isExpanded ? null : index)}
                    >
                      <GripVertical className="w-4 h-4 text-white/20" />
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stepType?.color + '20' }}>
                        <Icon className="w-4 h-4" style={{ color: stepType?.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-sm font-medium">{index + 1}. {stepType?.label}</span>
                        {step.content && <p className="text-white/40 text-xs truncate">{step.content}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); moveStep(index, 'up'); }} className="p-1 text-white/20 hover:text-white/60" disabled={index === 0}>
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); moveStep(index, 'down'); }} className="p-1 text-white/20 hover:text-white/60" disabled={index === selectedFlow.steps.length - 1}>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); removeStep(index); }} className="p-1 text-white/20 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
                        {(step.step_type === 'text' || step.step_type === 'buttons') && (
                          <div>
                            <label className="text-white/50 text-xs mb-1 block">Mensagem</label>
                            <Textarea
                              value={step.content || ''}
                              onChange={(e) => updateStep(index, { content: e.target.value })}
                              placeholder="Digite a mensagem..."
                              className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
                              rows={3}
                            />
                          </div>
                        )}

                        {(step.step_type === 'image' || step.step_type === 'audio' || step.step_type === 'video') && (
                          <>
                            <div>
                              <label className="text-white/50 text-xs mb-1 block">URL da Mídia</label>
                              <Input
                                value={step.media_url || ''}
                                onChange={(e) => updateStep(index, { media_url: e.target.value })}
                                placeholder="https://..."
                                className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-white/50 text-xs mb-1 block">Legenda (opcional)</label>
                              <Input
                                value={step.content || ''}
                                onChange={(e) => updateStep(index, { content: e.target.value })}
                                placeholder="Legenda da mídia"
                                className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30 text-sm"
                              />
                            </div>
                          </>
                        )}

                        {step.step_type === 'buttons' && (
                          <div className="space-y-2">
                            <label className="text-white/50 text-xs block">Opções de Botão (máx 3)</label>
                            {step.button_options.map((opt, oi) => (
                              <div key={oi} className="flex gap-2">
                                <Input
                                  value={opt}
                                  onChange={(e) => updateButtonOption(index, oi, e.target.value)}
                                  placeholder={`Botão ${oi + 1}`}
                                  className="bg-[#2a3942] border-white/10 text-white placeholder:text-white/30 text-sm"
                                />
                                <Button variant="ghost" size="sm" onClick={() => removeButtonOption(index, oi)} className="text-red-400 hover:text-red-300">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                            {step.button_options.length < 3 && (
                              <Button variant="ghost" size="sm" onClick={() => addButtonOption(index)} className="text-[#00a884] text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Adicionar botão
                              </Button>
                            )}
                          </div>
                        )}

                        {step.step_type === 'wait_reply' && (
                          <div>
                            <label className="text-white/50 text-xs mb-1 block">Tempo limite (segundos)</label>
                            <Input
                              type="number"
                              value={step.wait_timeout_seconds}
                              onChange={(e) => updateStep(index, { wait_timeout_seconds: parseInt(e.target.value) || 300 })}
                              className="bg-[#2a3942] border-white/10 text-white text-sm w-32"
                            />
                            <p className="text-white/30 text-xs mt-1">Após esse tempo, continua o fluxo automaticamente</p>
                          </div>
                        )}

                        {step.step_type !== 'wait_reply' && (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-white/50 text-xs mb-1 block">Delay antes (s)</label>
                                <Input
                                  type="number"
                                  value={step.delay_seconds}
                                  onChange={(e) => updateStep(index, { delay_seconds: parseInt(e.target.value) || 0 })}
                                  className="bg-[#2a3942] border-white/10 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-white/50 text-xs mb-1 block">Digitando (ms)</label>
                                <Input
                                  type="number"
                                  value={step.typing_duration_ms}
                                  onChange={(e) => updateStep(index, { typing_duration_ms: parseInt(e.target.value) || 0 })}
                                  className="bg-[#2a3942] border-white/10 text-white text-sm"
                                  disabled={!step.simulate_typing}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-white/50 text-xs">Simular digitando</span>
                              <button onClick={() => updateStep(index, { simulate_typing: !step.simulate_typing })}>
                                {step.simulate_typing
                                  ? <ToggleRight className="w-7 h-7 text-[#00a884]" />
                                  : <ToggleLeft className="w-7 h-7 text-white/30" />
                                }
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Step Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {STEP_TYPES.map(st => (
                  <button
                    key={st.value}
                    onClick={() => addStep(st.value as FlowStep['step_type'])}
                    className="flex items-center gap-2 bg-[#202c33] hover:bg-[#2a3942] border border-white/5 rounded-lg px-3 py-2.5 transition-all"
                  >
                    <st.icon className="w-4 h-4" style={{ color: st.color }} />
                    <span className="text-white/60 text-xs">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#111b21]">
      <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#00a884]" />
          <span className="text-white font-semibold text-sm">Fluxos de Mensagens</span>
        </div>
        <Button onClick={createNewFlow} size="sm" className="bg-[#00a884] hover:bg-[#00a884]/80 text-white text-sm h-8">
          <Plus className="w-4 h-4 mr-1" /> Novo Fluxo
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        ) : flows.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Zap className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm mb-1">Nenhum fluxo criado</p>
            <p className="text-white/20 text-xs mb-4">Crie fluxos para automatizar suas mensagens</p>
            <Button onClick={createNewFlow} className="bg-[#00a884] hover:bg-[#00a884]/80 text-white text-sm">
              <Plus className="w-4 h-4 mr-1" /> Criar Primeiro Fluxo
            </Button>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {flows.map(flow => (
              <div
                key={flow.id}
                className="bg-[#202c33] rounded-xl p-4 border border-white/5 hover:border-[#00a884]/30 transition-all cursor-pointer"
                onClick={() => {
                  setSelectedFlow({ ...flow, steps: flow.steps || [emptyStep()] });
                  setExpandedStep(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${flow.is_active ? 'bg-[#00a884]' : 'bg-white/20'}`} />
                    <div>
                      <h3 className="text-white text-sm font-medium">{flow.name}</h3>
                      {flow.description && <p className="text-white/40 text-xs mt-0.5">{flow.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/30 text-xs bg-[#2a3942] px-2 py-0.5 rounded">
                      {flow.trigger_type === 'manual' ? 'Manual' : flow.trigger_type === 'keyword' ? 'Palavra-chave' : '1ª Msg'}
                    </span>
                    <span className="text-white/30 text-xs">{(flow.steps || []).length} passos</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); if (flow.id) deleteFlow(flow.id); }}
                      className="text-white/20 hover:text-red-400 p-1 h-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
