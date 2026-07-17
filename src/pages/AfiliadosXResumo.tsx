import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

// Compat alias — redirects the affiliate to the canonical dashboard at /resumo/<id>.
// The dashboard itself (login, stats, edição) já é gerenciado por AffiliateResumo.tsx.
export default function AfiliadosXResumo() {
  const navigate = useNavigate();
  const [id, setId] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("mro_afiliadosx_last_id");
    if (saved) setId(saved);
  }, []);

  const go = () => {
    const clean = id.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!clean) return;
    localStorage.setItem("mro_afiliadosx_last_id", clean);
    navigate(`/resumo/${clean}`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <Card className="max-w-md w-full bg-zinc-950 border-yellow-500/30 p-8">
        <h1 className="text-2xl font-black mb-2">Acessar Dashboard de Afiliado</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Informe o identificador do seu link (ex.: <span className="text-yellow-400">joao</span>) para abrir seu painel.
        </p>
        <Label className="text-xs uppercase tracking-widest text-zinc-500 font-black">Seu identificador</Label>
        <Input
          value={id}
          onChange={e => setId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          placeholder="joao"
          className="bg-black border-zinc-800 mt-1 mb-4"
        />
        <Button onClick={go} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black">
          Abrir painel <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Card>
    </div>
  );
}
