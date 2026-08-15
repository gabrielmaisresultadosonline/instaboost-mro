import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, ExternalLink, User, 
  Play, Loader2, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function LotarGruposLessonView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      const email = session.user.email;
      const { data: user, error } = await supabase
        .from('lotargrupos_users')
        .select('*')
        .eq('email', email)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !user) {
        toast.error("Acesso não autorizado.");
        await supabase.auth.signOut();
        navigate('/login');
        return;
      }

      setUserData(user);
      
      const { data: lessonData } = await supabase
        .from('lotargrupos_lessons')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (!lessonData) {
        toast.error("Aula não encontrada.");
        navigate('/lotargrupos/dashboard');
        return;
      }

      setLesson(lessonData);
      setLoading(false);
    };

    checkAccess();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      {/* Top Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/lotargrupos/dashboard')}
          className="rounded-full text-slate-400 hover:bg-slate-800 hover:text-white font-bold px-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          VOLTAR
        </Button>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600 px-2 py-0.5 text-[10px] font-black">ÁREA DO ALUNO</Badge>
        </div>
      </nav>

      <main className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8 md:gap-12">
          
          {/* Main Video & Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="aspect-video w-full rounded-[2rem] bg-black border border-slate-800 shadow-2xl overflow-hidden relative group">
              {lesson.video_url ? (
                <iframe 
                  src={lesson.video_url} 
                  className="w-full h-full border-0" 
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                  <Play className="w-20 h-20 mb-4 opacity-10" />
                  <p className="font-bold uppercase tracking-widest text-xs opacity-20">Vídeo não disponível</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1 font-black">MÓDULO {lesson.order_index}</Badge>
                <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Lotar Grupos</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
                {lesson.title}
              </h1>
              <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" />
              
              <div className="p-6 md:p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800/50">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Sobre esta aula</h3>
                <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-line">
                  {lesson.description || "Esta aula não possui uma descrição detalhada."}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar / Materials */}
          <div className="space-y-6">
            <div className="p-8 rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-xl space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-xl flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" /> MATERIAIS
                </h3>
                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-800">COMPLEMENTAR</Badge>
              </div>
              
              <div className="space-y-3">
                {lesson.buttons && Array.isArray(lesson.buttons) && lesson.buttons.length > 0 ? (
                  lesson.buttons.map((btn: any, idx: number) => (
                    <a 
                      key={idx} 
                      href={btn.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all group"
                    >
                      <span className="font-bold text-sm text-slate-300 group-hover:text-white">{btn.label}</span>
                      <ExternalLink className="w-4 h-4 text-slate-700 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </a>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-slate-600 text-sm italic">Nenhum material disponível para esta aula.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Support Box */}
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/20 text-center space-y-6 group">
               <div className="mx-auto w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <MessageCircle className="w-8 h-8 text-white" />
               </div>
               <div className="space-y-2">
                 <h4 className="font-black text-xl uppercase italic">Suporte VIP</h4>
                 <p className="text-blue-100/70 text-sm leading-relaxed">Ficou com alguma dúvida sobre o conteúdo? Fale direto com nossos especialistas.</p>
               </div>
               <Button className="w-full bg-white text-blue-600 hover:bg-slate-100 font-black h-14 rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
                 ABRIR CHAMADO
               </Button>
            </div>

            {/* Student Info */}
            <Card className="rounded-[2.5rem] bg-slate-900 border-slate-800 overflow-hidden">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                  <User className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm truncate uppercase italic tracking-wider">{userData?.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold truncate">{userData?.email}</p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
