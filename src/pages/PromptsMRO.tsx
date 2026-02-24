import { useState } from "react";
import { Sparkles, Camera, Wand2, Star, CheckCircle, ArrowRight } from "lucide-react";

const PromptsMRO = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: integrate with backend
    console.log("Cadastro:", { name, email });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Hero */}
      <section className="relative py-16 px-4 flex flex-col items-center text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300 font-medium">Área Exclusiva de Prompts</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            PROMPTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">MRO</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-2 font-semibold">
            A melhor área de prompts para gerar suas fotos com qualidade.
          </p>
          <p className="text-gray-400 mb-10 max-w-lg mx-auto">
            Acesse centenas de prompts profissionais prontos para usar e transforme suas fotos com inteligência artificial.
          </p>

          {/* CTA Form */}
          <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-3">
            <input
              type="text"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <input
              type="email"
              placeholder="Seu melhor e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/25"
            >
              QUERO ACESSAR OS PROMPTS
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Camera,
              title: "Fotos Profissionais",
              desc: "Prompts otimizados para gerar fotos realistas e de alta qualidade.",
            },
            {
              icon: Wand2,
              title: "Fácil de Usar",
              desc: "Copie e cole os prompts prontos direto na IA de sua preferência.",
            },
            {
              icon: Star,
              title: "Atualizações Constantes",
              desc: "Novos prompts adicionados frequentemente para você sempre ter novidades.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center hover:border-purple-500/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">
            O que você vai encontrar
          </h2>
          <div className="space-y-4 text-left">
            {[
              "Prompts para fotos de perfil profissionais",
              "Prompts para fotos de produto e e-commerce",
              "Prompts para cenários e fundos criativos",
              "Prompts para retratos realistas e artísticos",
              "Categorias organizadas para fácil navegação",
              "Suporte e comunidade exclusiva",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-5 py-3.5">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-gray-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600 text-sm border-t border-white/5">
        <p>Prompts MRO © {new Date().getFullYear()} — Todos os direitos reservados</p>
      </footer>
    </div>
  );
};

export default PromptsMRO;
