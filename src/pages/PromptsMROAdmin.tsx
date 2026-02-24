import { useState, useEffect, useCallback } from "react";
import { Upload, Trash2, Eye, EyeOff, Users, Layers, LogOut, RefreshCw, Search, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface PromptItem {
  id: string;
  folder_name: string;
  prompt_text: string;
  image_url: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

interface PromptUser {
  id: string;
  name: string;
  email: string;
  status: string;
  last_access: string | null;
  created_at: string;
}

const callAdmin = async (action: string, body?: any) => {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/prompts-mro-admin?action=${action}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return res.json();
};

const PromptsMROAdmin = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"prompts" | "users">("prompts");
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [users, setUsers] = useState<PromptUser[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    const data = await callAdmin('get-prompts');
    if (data.prompts) setPrompts(data.prompts);
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await callAdmin('get-users');
    if (data.users) setUsers(data.users);
  }, []);

  useEffect(() => {
    if (isAuth) {
      loadPrompts();
      loadUsers();
    }
  }, [isAuth, loadPrompts, loadUsers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await callAdmin('login', { email, password });
    if (data.success) {
      setIsAuth(true);
      toast.success("Login realizado!");
    } else {
      toast.error("Credenciais inválidas");
    }
  };

  const handleUploadZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      toast.error("Envie apenas arquivos .zip");
      return;
    }

    setUploading(true);
    setUploadProgress("Enviando e processando ZIP...");

    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await callAdmin('upload-zip', formData);

      if (data.success) {
        toast.success(`${data.processed} prompts processados de ${data.total} pastas!`);
        loadPrompts();
      } else {
        toast.error(data.error || "Erro ao processar ZIP");
      }
    } catch (err) {
      toast.error("Erro ao enviar arquivo");
    }

    setUploading(false);
    setUploadProgress("");
    e.target.value = "";
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm("Deletar este prompt?")) return;
    await callAdmin('delete-prompt', { id });
    setPrompts(prev => prev.filter(p => p.id !== id));
    toast.success("Prompt deletado");
  };

  const handleDeleteAll = async () => {
    if (!confirm("ATENÇÃO: Deletar TODOS os prompts? Esta ação não pode ser desfeita!")) return;
    await callAdmin('delete-all-prompts');
    setPrompts([]);
    toast.success("Todos os prompts deletados");
  };

  const handleTogglePrompt = async (id: string, currentActive: boolean) => {
    await callAdmin('toggle-prompt', { id, is_active: !currentActive });
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentActive } : p));
  };

  const handleToggleUser = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await callAdmin('toggle-user', { id, status: newStatus });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
    toast.success(`Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'}`);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Deletar este usuário?")) return;
    await callAdmin('delete-user', { id });
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.success("Usuário deletado");
  };

  const filteredPrompts = prompts.filter(p =>
    p.folder_name.toLowerCase().includes(search.toLowerCase()) ||
    p.prompt_text.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center px-4">
        <div className="bg-[#111118] border border-white/10 rounded-2xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1">Prompts MRO Admin</h1>
          <p className="text-gray-500 text-sm mb-6">Acesse o painel administrativo</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
            <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-lg">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Header */}
      <header className="bg-[#0a0a10] border-b border-white/5 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Prompts MRO <span className="text-purple-400">Admin</span></h1>
          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 rounded-lg p-1">
              <button onClick={() => setTab("prompts")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'prompts' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <Layers className="w-4 h-4 inline mr-1" /> Prompts ({prompts.length})
              </button>
              <button onClick={() => setTab("users")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'users' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                <Users className="w-4 h-4 inline mr-1" /> Usuários ({users.length})
              </button>
            </div>
            <button onClick={() => setIsAuth(false)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === "prompts" && (
          <div>
            {/* Upload area */}
            <div className="bg-[#111118] border border-dashed border-purple-500/30 rounded-2xl p-8 text-center mb-6">
              <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold mb-1">Enviar arquivo ZIP com prompts</h2>
              <p className="text-gray-500 text-sm mb-4">Cada pasta dentro do ZIP será um prompt (imagem + arquivo .txt ou .pdf)</p>
              
              <label className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold cursor-pointer transition-all ${uploading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'}`}>
                <Upload className="w-5 h-5" />
                {uploading ? uploadProgress : "Selecionar ZIP"}
                <input type="file" accept=".zip" onChange={handleUploadZip} disabled={uploading} className="hidden" />
              </label>

              {prompts.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-4">
                  <button onClick={() => loadPrompts()} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                    <RefreshCw className="w-4 h-4" /> Atualizar
                  </button>
                  <button onClick={handleDeleteAll} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Deletar Todos
                  </button>
                </div>
              )}
            </div>

            {/* Search */}
            {prompts.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input type="text" placeholder="Buscar prompts..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
            )}

            {/* Prompts grid */}
            {loading ? (
              <div className="text-center py-20 text-gray-500">Carregando...</div>
            ) : filteredPrompts.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                {prompts.length === 0 ? "Nenhum prompt cadastrado. Envie um ZIP para começar." : "Nenhum resultado encontrado."}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrompts.map(prompt => (
                  <div key={prompt.id} className={`bg-[#111118] border rounded-xl overflow-hidden transition-colors ${prompt.is_active ? 'border-white/10' : 'border-red-500/20 opacity-60'}`}>
                    {prompt.image_url && (
                      <div className="aspect-square bg-black/50 flex items-center justify-center overflow-hidden">
                        <img src={prompt.image_url} alt={prompt.folder_name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-sm text-purple-300 mb-2">{prompt.folder_name}</h3>
                      <p className="text-gray-400 text-xs line-clamp-4 mb-3 whitespace-pre-wrap">{prompt.prompt_text.substring(0, 300)}{prompt.prompt_text.length > 300 ? '...' : ''}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleTogglePrompt(prompt.id, prompt.is_active)} className={`p-2 rounded-lg text-xs flex items-center gap-1 ${prompt.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {prompt.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {prompt.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                        <button onClick={() => handleDeletePrompt(prompt.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "users" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Usuários Cadastrados ({users.length})</h2>
              <button onClick={loadUsers} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
                <RefreshCw className="w-4 h-4" /> Atualizar
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-20 text-gray-500">Nenhum usuário cadastrado ainda.</div>
            ) : (
              <div className="bg-[#111118] border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 text-left text-gray-400">
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">E-mail</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Cadastro</th>
                        <th className="px-4 py-3">Último Acesso</th>
                        <th className="px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-medium">{user.name}</td>
                          <td className="px-4 py-3 text-gray-400">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {user.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3 text-gray-500">{user.last_access ? new Date(user.last_access).toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleToggleUser(user.id, user.status)} className={`p-1.5 rounded-lg ${user.status === 'active' ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-green-400 hover:bg-green-500/10'}`}>
                                {user.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptsMROAdmin;
