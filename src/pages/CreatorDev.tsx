import React from 'react';
import { Button } from "@/components/ui/button";
import { Code2, Database, Globe, ArrowRight } from 'lucide-react';

const CreatorDev = () => {
  const goToContact = () => {
    window.location.href = '/creatordev/projeto';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm font-medium">
          <Code2 className="w-4 h-4" />
          CreatorDev
        </div>

        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          PROGRAMAMOS seu sistema,<br />
          seu site, seu <span className="text-blue-400">banco de dados!</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
          Conte para nós a sua ideia e vamos criar para você.
          Soluções sob medida, do zero, com tecnologia de ponta.
        </p>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto py-4">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10">
            <Globe className="w-6 h-6 text-blue-400" />
            <span className="text-xs text-slate-300">Sites</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10">
            <Code2 className="w-6 h-6 text-purple-400" />
            <span className="text-xs text-slate-300">Sistemas</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10">
            <Database className="w-6 h-6 text-cyan-400" />
            <span className="text-xs text-slate-300">Banco de Dados</span>
          </div>
        </div>

        <Button
          onClick={goToContact}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/30 group"
        >
          Conte sua ideia
          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>

        <p className="text-xs text-slate-500">
          &copy; 2024 CreatorDev. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default CreatorDev;
