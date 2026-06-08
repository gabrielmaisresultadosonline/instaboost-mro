import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Video, ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoMro from "@/assets/logo-mro.png";

export default function VenderObrigado() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-yellow-400 selection:text-black flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/10 blur-[60px] md:blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/5 blur-[60px] md:blur-[120px] rounded-full" />
      </div>

      <div className="max-w-3xl w-full text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <img src={logoMro} alt="MRO" className="h-16 mx-auto mb-8 object-contain" />
          
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500/10 rounded-full mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>

          <Badge className="bg-green-500 text-white font-black px-6 py-2 rounded-full border-none uppercase tracking-widest block mx-auto w-fit">
            Pagamento Identificado
          </Badge>

          <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase leading-tight">
            ACESSO ENVIADO <br />
            <span className="text-yellow-500">PARA SEU E-MAIL</span>
          </h1>

          <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-xl space-y-6">
            <p className="text-xl md:text-2xl text-gray-300 font-medium leading-relaxed">
              Confere seu e-mail agora mesmo e <span className="text-white font-bold underline decoration-yellow-500 underline-offset-4">assista a imersão completa</span> para começar a automatizar suas vendas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">Verifique a caixa</p>
                  <p className="font-bold text-gray-200">Spam ou Promoções</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">Próximo Passo</p>
                  <p className="font-bold text-gray-200">Assista a Imersão</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/vendernainternet/login')}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-black h-20 px-12 rounded-2xl text-xl md:text-2xl transition-all hover:scale-105 shadow-[0_0_40px_rgba(234,179,8,0.2)] group w-full md:w-auto"
            >
              ACESSAR ÁREA DE MEMBROS <ArrowRight className="ml-3 w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </Button>
            
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Sua jornada começa agora
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
