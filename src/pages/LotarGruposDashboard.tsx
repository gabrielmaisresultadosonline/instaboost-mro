import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Video, Play, CheckCircle2, LayoutDashboard, 
  LogOut, FileText, ExternalLink, User, Settings,
  Menu, X, ChevronRight, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

import { toast } from 'sonner';

export default function LotarGruposDashboard() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/lotargrupos/login');
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
        toast.error("Acesso não autorizado ou expirado.");
        await supabase.auth.signOut();
        navigate('/lotargrupos/login');
        return;
      }

      setUserData(user);
      
      const { data: lessonsData } = await supabase
        .from('lotargrupos_lessons')
        .select('*')
        .eq('status', 'active')
        .order('order_index', { ascending: true });
      
      setLessons(lessonsData || []);
      if (lessonsData && lessonsData.length > 0) {
        setActiveLesson(lessonsData[0]);
      }
      setLoading(false);
    };

    checkAccess();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row font-sans">
      {/* Sidebar Mobile Toggle */}
      <div className="md:hidden p-4 flex justify-between items-center border-b border-slate-800 bg-slate-950 z-50">
        <h2 className="font-black text-xl tracking-tighter text-blue-500">LOTAR GRUPOS</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-80 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-8 hidden md:block">
            <h2 className="font-black text-2xl tracking-tighter text-blue-500">LOTAR GRUPOS</h2>
            <p className="text-[10px] uppercase font-bold text-slate-500 mt-1 tracking-widest">Plataforma de Alunos</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2 py-4">
            <p className="text-[10px] font-bold text-slate-500 px-4 mb-2 uppercase tracking-widest">Conteúdo do Curso</p>
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => { setActiveLesson(lesson); setIsSidebarOpen(false); }}
                className={`w-full text-left p-4 rounded-2xl transition-all group flex items-start gap-4 ${
                  activeLesson?.id === lesson.id 
                    ? 'bg-blue-600 shadow-lg shadow-blue-500/20' 
                    : 'hover:bg-slate-800'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                  activeLesson?.id === lesson.id ? 'bg-white/20' : 'bg-slate-800 text-slate-500'
                }`}>
                  {lesson.order_index}
                </div>
                <div>
                  <h4 className={`font-bold text-sm leading-snug ${activeLesson?.id === lesson.id ? 'text-white' : 'text-slate-300'}`}>
                    {lesson.title}
                  </h4>
                  <p className={`text-[10px] mt-1 ${activeLesson?.id === lesson.id ? 'text-blue-100' : 'text-slate-500'}`}>
                    Aula liberada
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800 space-y-2">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                <User className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm truncate">{userData?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{userData?.email}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800 h-12 rounded-xl" onClick={() => navigate('/dashboard')}>
              <LayoutDashboard className="w-4 h-4" /> Voltar ao Hub
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-slate-800 h-12 rounded-xl" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Sair da conta
            </Button>

          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeLesson ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 max-w-6xl mx-auto w-full">
            <div className="aspect-video w-full rounded-[2.5rem] bg-black border border-slate-800 shadow-2xl overflow-hidden mb-10 relative group cursor-pointer">

              {activeLesson.video_url ? (
                <iframe 
                  src={activeLesson.video_url} 
                  className="w-full h-full border-0" 
                  allowFullScreen
                />
              ) : activeLesson.thumbnail_url ? (
                <div className="w-full h-full relative">
                  <img src={activeLesson.thumbnail_url} alt={activeLesson.title} className="w-full h-full object-cover" />
                </div>


              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                  <Play className="w-20 h-20 mb-4 opacity-10" />
                  <p className="font-bold uppercase tracking-widest text-xs opacity-30">Vídeo não disponível</p>
                </div>
              )}
            </div>


            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-600 px-3 py-1 font-black">AULA {activeLesson.order_index}</Badge>
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Lotar Grupos</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black">{activeLesson.title}</h1>
                <div className="h-1 w-20 bg-blue-600 rounded-full" />
                <p className="text-slate-400 text-lg leading-relaxed whitespace-pre-line">
                  {activeLesson.description || "Sem descrição disponível para esta aula."}
                </p>
              </div>

              <div className="space-y-6">
                <div className="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 space-y-6">
                  <h3 className="font-black text-xl flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" /> MATERIAIS
                  </h3>
                  <div className="space-y-3">
                    {activeLesson.buttons && Array.isArray(activeLesson.buttons) && activeLesson.buttons.length > 0 ? (
                      activeLesson.buttons.map((btn: any, idx: number) => (
                        <a 
                          key={idx} 
                          href={btn.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition-colors group"
                        >
                          <span className="font-bold text-sm text-slate-300 group-hover:text-white transition-colors">{btn.label}</span>
                          <ExternalLink className="w-4 h-4 text-slate-700 group-hover:text-blue-500" />
                        </a>
                      ))
                    ) : (
                      <p className="text-slate-600 text-xs italic">Nenhum material complementar para esta aula.</p>
                    )}
                  </div>
                </div>

                <div className="p-8 rounded-[2rem] bg-blue-600 shadow-xl shadow-blue-600/10 text-center space-y-4">
                   <h4 className="font-black text-lg">Precisa de Ajuda?</h4>
                   <p className="text-blue-100 text-sm">Nossa equipe está pronta para te auxiliar em qualquer dúvida técnica.</p>
                   <Button variant="secondary" className="w-full font-bold h-12 rounded-xl" onClick={() => window.open('https://maisresultadosonline.com.br/whatsapp', '_blank')}>Suporte WhatsApp</Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
              <LayoutDashboard className="w-10 h-10 text-slate-700" />
            </div>
            <h2 className="text-2xl font-black mb-2">Selecione uma aula</h2>
            <p className="text-slate-500 max-w-xs">Escolha um conteúdo no menu lateral para começar a assistir.</p>
          </div>
        )}
      </main>
    </div>
  );
}
