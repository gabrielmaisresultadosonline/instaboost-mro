import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Copy, Check, Palette, Smartphone, Square, Plus, X } from "lucide-react";

const DEFAULT_COLORS = ["#000000", "#FFFFFF", "#3B82F6", "#EF4444"];

const PostsPrompts = () => {
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"feed" | "stories">("feed");
  const [colors, setColors] = useState<string[]>(["#000000"]);
  const [loading, setLoading] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const updateColor = (idx: number, value: string) => {
    const next = [...colors];
    next[idx] = value;
    setColors(next);
  };

  const addColor = () => {
    if (colors.length >= 4) return;
    setColors([...colors, DEFAULT_COLORS[colors.length] || "#000000"]);
  };

  const removeColor = (idx: number) => {
    if (colors.length <= 1) return;
    setColors(colors.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Descreva como você quer a imagem");
      return;
    }
    setLoading(true);
    setGeneratedPrompt("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-image-prompt", {
        body: { description: description.trim(), format, colors },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.prompt) throw new Error("Prompt não gerado");
      setGeneratedPrompt(data.prompt);
      toast.success("Prompt gerado com sucesso!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar prompt");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success("Prompt copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 px-4 py-2 rounded-full text-sm mb-4 border border-purple-500/30">
            <Sparkles className="w-4 h-4" />
            Gerador de Prompts Profissionais
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            MRO<span className="text-purple-400">IMAGEM PRO</span>
          </h1>
          <p className="text-slate-300 max-w-xl mx-auto">
            Descreva sua imagem, escolha cores e formato. Geramos um prompt profissional nível designer sênior pronto para usar em qualquer IA.
          </p>
        </div>

        <Card className="bg-slate-800/60 border-slate-700 backdrop-blur shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Configure seu criativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Descrição */}
            <div>
              <Label className="text-slate-200 mb-2 block">Como você quer a imagem?</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Uma imagem para vender curso de marketing digital, com um celular flutuando e ícones de redes sociais ao redor..."
                rows={5}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Formato */}
            <div>
              <Label className="text-slate-200 mb-2 block">Formato</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("feed")}
                  className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                    format === "feed"
                      ? "border-purple-500 bg-purple-500/20 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <Square className="w-6 h-6" />
                  <span className="font-semibold">Feed</span>
                  <span className="text-xs">1080 x 1350</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("stories")}
                  className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                    format === "stories"
                      ? "border-purple-500 bg-purple-500/20 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <Smartphone className="w-6 h-6" />
                  <span className="font-semibold">Stories</span>
                  <span className="text-xs">1080 x 1920</span>
                </button>
              </div>
            </div>

            {/* Cores */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-200 flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Cores do criativo ({colors.length}/4)
                </Label>
                {colors.length < 4 && (
                  <Button type="button" size="sm" variant="ghost" onClick={addColor} className="text-purple-400 hover:text-purple-300">
                    <Plus className="w-4 h-4 mr-1" /> Adicionar cor
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {colors.map((color, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-3 relative">
                    {colors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColor(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <div className="text-xs text-slate-400 mb-2">Cor {idx + 1}</div>
                    <label
                      className="block w-full h-16 rounded-md cursor-pointer border-2 border-slate-700 hover:border-purple-500 transition relative overflow-hidden"
                      style={{ backgroundColor: color }}
                      title="Clique para escolher a cor"
                    >
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => updateColor(idx, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => updateColor(idx, e.target.value)}
                      className="mt-2 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white uppercase text-center font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 text-base font-semibold"
            >
              {loading ? (
                <>Gerando prompt profissional...</>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" /> Gerar Prompt Profissional
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {generatedPrompt && (
          <Card className="bg-slate-800/60 border-purple-500/40 backdrop-blur shadow-2xl mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" /> Prompt Gerado
              </CardTitle>
              <Button onClick={handleCopy} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                {copied ? <><Check className="w-4 h-4 mr-1" /> Copiado</> : <><Copy className="w-4 h-4 mr-1" /> Copiar</>}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                {generatedPrompt}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                💡 Cole esse prompt em qualquer IA de imagens (ChatGPT, Gemini, MidJourney, etc.)
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PostsPrompts;
