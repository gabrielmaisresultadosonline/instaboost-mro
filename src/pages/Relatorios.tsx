import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, DollarSign, Lock } from "lucide-react";

const CORRECT_EMAIL = "mro@gmail.com";
const CORRECT_PASSWORD = "Ga145523@";

const empresas = [
  { nome: "Pizzaria Bella Napoli", nicho: "Pizzaria", valor: 600 },
  { nome: "Pizzaria Forno & Massa", nicho: "Pizzaria", valor: 600 },
  { nome: "Pizzaria Don Pietro", nicho: "Pizzaria", valor: 600 },
  { nome: "Pizzaria Sabor Supremo", nicho: "Pizzaria", valor: 600 },
  { nome: "Pizzaria La Famiglia", nicho: "Pizzaria", valor: 600 },
  { nome: "Pizzaria Crosta Dourada", nicho: "Pizzaria", valor: 600 },
  { nome: "Academia Iron Fitness", nicho: "Academia", valor: 1000 },
  { nome: "Academia Corpo & Mente", nicho: "Academia", valor: 1000 },
  { nome: "Academia Power Gym", nicho: "Academia", valor: 1000 },
  { nome: "Academia Vida Ativa", nicho: "Academia", valor: 1000 },
  { nome: "Academia Elite Training", nicho: "Academia", valor: 1000 },
  { nome: "Academia Force Center", nicho: "Academia", valor: 1000 },
  { nome: "Dr. Marcos Oliveira - Dentista", nicho: "Dentista", valor: 400 },
  { nome: "Clínica Sorriso Perfeito", nicho: "Dentista", valor: 400 },
  { nome: "Odonto Prime Clínica", nicho: "Dentista", valor: 400 },
  { nome: "Dra. Ana Beatriz - Ortodontia", nicho: "Dentista", valor: 400 },
  { nome: "Clínica Dental Care Plus", nicho: "Dentista", valor: 400 },
  { nome: "Dr. Rafael Lima - Implantes", nicho: "Dentista", valor: 400 },
  { nome: "Advocacia Torres & Associados", nicho: "Advogado", valor: 1000 },
  { nome: "Dr. Fernando Mendes - Advocacia", nicho: "Advogado", valor: 1000 },
  { nome: "Escritório Jurídico Capital", nicho: "Advogado", valor: 1000 },
  { nome: "Dra. Camila Rocha - Direito Civil", nicho: "Advogado", valor: 1000 },
  { nome: "Advocacia Silva & Partners", nicho: "Advogado", valor: 1000 },
  { nome: "Dr. Lucas Andrade - Trabalhista", nicho: "Advogado", valor: 1000 },
];

const Relatorios = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === CORRECT_EMAIL && password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Email ou senha incorretos");
    }
  };

  const totalReceita = empresas.reduce((acc, e) => acc + e.valor, 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 bg-gray-900 border-gray-800">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Lock className="w-10 h-10 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Relatórios</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-400" />
            Relatório de Empresas
          </h1>
          <Card className="bg-emerald-600/20 border-emerald-500/30 px-5 py-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-emerald-300">Receita Mensal Total</p>
                <p className="text-xl font-bold text-emerald-400">
                  R$ {totalReceita.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          {empresas.map((empresa, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-gray-500 text-sm font-mono w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{empresa.nome}</p>
                  <p className="text-gray-400 text-xs">{empresa.nicho}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30">
                  Ativa
                </Badge>
                <span className="text-emerald-400 font-bold whitespace-nowrap">
                  R$ {empresa.valor.toLocaleString("pt-BR")}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
