import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, 
  Video, 
  BookOpen,
  LogOut,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Loader2,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Copy,
  Eye,
  Upload,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Image,
  Database,
  Download
} from "lucide-react";
import logoMro from "@/assets/logo-mro.png";

type Tab = "users" | "modules" | "videos" | "backup";

const MetodoSeguidorAdmin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [activeTab, setActiveTab] = useState<Tab>("users");
  
  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Modules state
  const [modules, setModules] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [newModule, setNewModule] = useState({ title: "", description: "", thumbnail_url: "" });
  const [showNewModule, setShowNewModule] = useState(false);
  const [uploadingCover, setUploadingCover] = useState<string | null>(null);
  
  // Videos state
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [newVideo, setNewVideo] = useState({ 
    module_id: "", title: "", description: "", video_url: "", video_type: "youtube", thumbnail_url: "", duration: "" 
  });
  const [showNewVideo, setShowNewVideo] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [uploadingVideoThumb, setUploadingVideoThumb] = useState<string | null>(null);
  
  // Backup state
  const [backupLoading, setBackupLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  
  // File input refs
  const coverInputRef = useRef<HTMLInputElement>(null);
  const newCoverInputRef = useRef<HTMLInputElement>(null);
  const videoThumbInputRef = useRef<HTMLInputElement>(null);
  const newVideoThumbInputRef = useRef<HTMLInputElement>(null);

  // Auto verification interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoggedIn) {
      interval = setInterval(() => {
        verifyPendingOrders();
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoggedIn, orders]);

  const verifyPendingOrders = async () => {
    const pendingOrders = orders.filter(o => o.status === "pending");
    
    for (const order of pendingOrders) {
      try {
        await supabase.functions.invoke("metodo-seguidor-verify-payment", {
          body: { nsu_order: order.nsu_order }
        });
      } catch (e) {
        console.error("Error verifying order:", e);
      }
    }
    
    if (pendingOrders.length > 0) {
      loadUsers();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("metodo-seguidor-admin-auth", {
        body: { email: email.trim(), password: password.trim() }
      });

      if (error || !data?.success) {
        toast.error("Credenciais inválidas");
        return;
      }

      setIsLoggedIn(true);
      localStorage.setItem("metodo_seguidor_admin", "true");
      toast.success("Login realizado!");
      
    } catch (error) {
      toast.error("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("metodo_seguidor_admin");
    setIsLoggedIn(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem("metodo_seguidor_admin");
    if (saved) setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    
    if (activeTab === "users") loadUsers();
    if (activeTab === "modules") loadModules();
    if (activeTab === "videos") { loadModules(); loadVideos(); }
    if (activeTab === "backup") checkLastBackup();
  }, [activeTab, isLoggedIn]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: usersData } = await supabase.functions.invoke("metodo-seguidor-admin-data", {
        body: { action: "get-users" }
      });
      const { data: ordersData } = await supabase.functions.invoke("metodo-seguidor-admin-data", {
        body: { action: "get-orders" }
      });
      
      if (usersData?.users) setUsers(usersData.users);
      if (ordersData?.orders) setOrders(ordersData.orders);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadModules = async () => {
    setLoadingModules(true);
    try {
      const { data } = await supabase
        .from("metodo_seguidor_modules")
        .select("*")
        .order("order_index");
      if (data) setModules(data);
    } catch (error) {
      console.error("Error loading modules:", error);
    } finally {
      setLoadingModules(false);
    }
  };

  const loadVideos = async () => {
    setLoadingVideos(true);
    try {
      const { data } = await supabase
        .from("metodo_seguidor_videos")
        .select("*")
        .order("order_index");
      if (data) setVideos(data);
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Upload cover image
  const uploadCover = async (file: File, type: "module" | "video", id?: string) => {
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${type}-${id || "new"}-${Date.now()}.${ext}`;
      const filePath = `covers/${fileName}`;

      const { data, error } = await supabase.storage
        .from("metodo-seguidor-content")
        .upload(filePath, file, { 
          cacheControl: "3600",
          upsert: true 
        });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from("metodo-seguidor-content")
        .getPublicUrl(filePath);

      return publicData.publicUrl;
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Erro ao fazer upload da capa");
      return null;
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>, moduleId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(moduleId);
    const url = await uploadCover(file, "module", moduleId);
    
    if (url) {
      if (editingModule?.id === moduleId) {
        setEditingModule({ ...editingModule, thumbnail_url: url });
      } else {
        // Update directly in DB
        await supabase
          .from("metodo_seguidor_modules")
          .update({ thumbnail_url: url })
          .eq("id", moduleId);
        toast.success("Capa atualizada!");
        loadModules();
      }
    }
    setUploadingCover(null);
  };

  const handleNewModuleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover("new");
    const url = await uploadCover(file, "module");
    if (url) {
      setNewModule({ ...newModule, thumbnail_url: url });
    }
    setUploadingCover(null);
  };

  const handleVideoThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>, videoId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideoThumb(videoId);
    const url = await uploadCover(file, "video", videoId);
    
    if (url) {
      if (editingVideo?.id === videoId) {
        setEditingVideo({ ...editingVideo, thumbnail_url: url });
      } else {
        await supabase
          .from("metodo_seguidor_videos")
          .update({ thumbnail_url: url })
          .eq("id", videoId);
        toast.success("Thumbnail atualizada!");
        loadVideos();
      }
    }
    setUploadingVideoThumb(null);
  };

  const handleNewVideoThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideoThumb("new");
    const url = await uploadCover(file, "video");
    if (url) {
      setNewVideo({ ...newVideo, thumbnail_url: url });
    }
    setUploadingVideoThumb(null);
  };

  // Backup functions
  const checkLastBackup = async () => {
    try {
      const { data } = await supabase.storage
        .from("metodo-seguidor-backup")
        .list("", { limit: 1, sortBy: { column: "created_at", order: "desc" } });
      
      if (data && data.length > 0) {
        setLastBackup(data[0].created_at);
      }
    } catch (error) {
      console.error("Error checking backup:", error);
    }
  };

  const createBackup = async () => {
    setBackupLoading(true);
    try {
      // Get all data
      const { data: modulesData } = await supabase
        .from("metodo_seguidor_modules")
        .select("*")
        .order("order_index");

      const { data: videosData } = await supabase
        .from("metodo_seguidor_videos")
        .select("*")
        .order("order_index");

      const { data: usersData } = await supabase.functions.invoke("metodo-seguidor-admin-data", {
        body: { action: "get-users" }
      });

      const { data: ordersData } = await supabase.functions.invoke("metodo-seguidor-admin-data", {
        body: { action: "get-orders" }
      });

      const backupData = {
        timestamp: new Date().toISOString(),
        modules: modulesData || [],
        videos: videosData || [],
        users: usersData?.users || [],
        orders: ordersData?.orders || []
      };

      const fileName = `backup-${new Date().toISOString().split("T")[0]}-${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });

      const { error } = await supabase.storage
        .from("metodo-seguidor-backup")
        .upload(fileName, blob, { 
          cacheControl: "3600",
          upsert: false 
        });

      if (error) throw error;

      toast.success("Backup criado com sucesso!");
      checkLastBackup();
    } catch (error) {
      console.error("Error creating backup:", error);
      toast.error("Erro ao criar backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const createModule = async () => {
    if (!newModule.title) {
      toast.error("Título é obrigatório");
      return;
    }

    try {
      const { error } = await supabase.from("metodo_seguidor_modules").insert({
        ...newModule,
        order_index: modules.length
      });

      if (error) throw error;

      toast.success("Módulo criado!");
      setNewModule({ title: "", description: "", thumbnail_url: "" });
      setShowNewModule(false);
      loadModules();
    } catch (error) {
      toast.error("Erro ao criar módulo");
    }
  };

  const updateModule = async (module: any) => {
    try {
      const { error } = await supabase
        .from("metodo_seguidor_modules")
        .update({
          title: module.title,
          description: module.description,
          thumbnail_url: module.thumbnail_url
        })
        .eq("id", module.id);

      if (error) throw error;

      toast.success("Módulo atualizado!");
      setEditingModule(null);
      loadModules();
    } catch (error) {
      toast.error("Erro ao atualizar módulo");
    }
  };

  const deleteModule = async (id: string) => {
    if (!confirm("Isso excluirá o módulo e todos os vídeos. Continuar?")) return;

    try {
      const { error } = await supabase.from("metodo_seguidor_modules").delete().eq("id", id);
      if (error) throw error;
      toast.success("Módulo excluído!");
      loadModules();
      loadVideos();
    } catch (error) {
      toast.error("Erro ao excluir módulo");
    }
  };

  const createVideo = async () => {
    if (!newVideo.module_id || !newVideo.title || !newVideo.video_url) {
      toast.error("Módulo, título e URL são obrigatórios");
      return;
    }

    try {
      const moduleVideos = videos.filter(v => v.module_id === newVideo.module_id);
      const { error } = await supabase.from("metodo_seguidor_videos").insert({
        ...newVideo,
        order_index: moduleVideos.length
      });

      if (error) throw error;

      toast.success("Vídeo criado!");
      setNewVideo({ module_id: "", title: "", description: "", video_url: "", video_type: "youtube", thumbnail_url: "", duration: "" });
      setShowNewVideo(false);
      loadVideos();
    } catch (error) {
      toast.error("Erro ao criar vídeo");
    }
  };

  const updateVideo = async (video: any) => {
    try {
      const { error } = await supabase
        .from("metodo_seguidor_videos")
        .update({
          title: video.title,
          description: video.description,
          video_url: video.video_url,
          video_type: video.video_type,
          thumbnail_url: video.thumbnail_url,
          duration: video.duration
        })
        .eq("id", video.id);

      if (error) throw error;

      toast.success("Vídeo atualizado!");
      setEditingVideo(null);
      loadVideos();
    } catch (error) {
      toast.error("Erro ao atualizar vídeo");
    }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm("Excluir este vídeo?")) return;

    try {
      const { error } = await supabase.from("metodo_seguidor_videos").delete().eq("id", id);
      if (error) throw error;
      toast.success("Vídeo excluído!");
      loadVideos();
    } catch (error) {
      toast.error("Erro ao excluir vídeo");
    }
  };

  const copyCredentials = (user: any) => {
    const text = `🔐 *Acesso Método de Correção MRO*\n\n👤 Usuário: ${user.username}\n🔑 Senha: ${user.password}\n\n🔗 Link: https://maisresultadosonline.com.br/metodoseguidormembro`;
    navigator.clipboard.writeText(text);
    toast.success("Credenciais copiadas!");
  };

  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    paid: orders.filter(o => o.status === "paid").length,
    expired: orders.filter(o => o.status === "expired").length,
    totalRevenue: orders.filter(o => o.status === "paid").reduce((acc, o) => acc + (o.amount || 0), 0)
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logoMro} alt="MRO" className="h-16 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white">Admin - Método Seguidor</h1>
          </div>

          <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
            <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-black">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-black border-b border-gray-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoMro} alt="MRO" className="h-10" />
            <span className="text-gray-400">Admin Método Seguidor</span>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <LogOut className="w-5 h-5 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 bg-black/50 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {[
            { id: "users", label: "Usuários", icon: Users },
            { id: "modules", label: "Módulos", icon: BookOpen },
            { id: "videos", label: "Vídeos", icon: Video },
            { id: "backup", label: "Backup", icon: Database }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? "border-amber-500 text-amber-400" 
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-400 text-sm">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-400 text-sm">Pagos</p>
                <p className="text-2xl font-bold text-green-400">{stats.paid}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">Expirados</p>
                <p className="text-2xl font-bold text-red-400">{stats.expired}</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-amber-400 text-sm">Receita</p>
                <p className="text-2xl font-bold text-amber-400">R$ {stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4">
              <Button 
                onClick={loadUsers} 
                variant="outline" 
                size="sm"
                className="border-gray-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 text-sm"
              >
                <option value="all">Todos</option>
                <option value="pending">Pendentes</option>
                <option value="paid">Pagos</option>
                <option value="expired">Expirados</option>
              </select>
            </div>

            {/* Orders Table */}
            {loadingUsers ? (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="text-left p-3 text-gray-400">Email</th>
                        <th className="text-left p-3 text-gray-400">Instagram</th>
                        <th className="text-left p-3 text-gray-400">Telefone</th>
                        <th className="text-left p-3 text-gray-400">Valor</th>
                        <th className="text-left p-3 text-gray-400">Status</th>
                        <th className="text-left p-3 text-gray-400">Data</th>
                        <th className="text-left p-3 text-gray-400">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {filteredOrders.map(order => {
                        const user = users.find(u => u.id === order.user_id);
                        return (
                          <tr key={order.id} className="hover:bg-gray-800/50">
                            <td className="p-3">{order.email}</td>
                            <td className="p-3 text-amber-400">@{order.instagram_username}</td>
                            <td className="p-3 text-gray-400">{order.phone || "-"}</td>
                            <td className="p-3">R$ {(order.amount || 0).toFixed(2)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === "paid" ? "bg-green-500/20 text-green-400" :
                                order.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-red-500/20 text-red-400"
                              }`}>
                                {order.status === "paid" ? "Pago" : order.status === "pending" ? "Pendente" : "Expirado"}
                              </span>
                            </td>
                            <td className="p-3 text-gray-400">
                              {new Date(order.created_at).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="p-3">
                              {user && order.status === "paid" && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => copyCredentials(user)}
                                  className="text-amber-400 hover:text-amber-300"
                                >
                                  <Copy className="w-4 h-4 mr-1" />
                                  Copiar Acesso
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500">
                            Nenhum pedido encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modules Tab */}
        {activeTab === "modules" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Módulos</h2>
              <Button onClick={() => setShowNewModule(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="w-5 h-5 mr-2" />
                Novo Módulo
              </Button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-blue-400 text-sm">
                <Image className="w-4 h-4 inline mr-2" />
                Capas no formato 1080x1920 (vertical) estilo Netflix. Você pode fazer upload diretamente ou colar uma URL.
              </p>
            </div>

            {showNewModule && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <h3 className="font-bold mb-4">Criar Módulo</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Título do módulo"
                    value={newModule.title}
                    onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                    className="bg-gray-800 border-gray-700"
                  />
                  <Textarea
                    placeholder="Descrição (opcional)"
                    value={newModule.description}
                    onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                    className="bg-gray-800 border-gray-700"
                  />
                  
                  {/* Cover Upload */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Capa (1080x1920)</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL da capa ou faça upload"
                        value={newModule.thumbnail_url}
                        onChange={(e) => setNewModule({ ...newModule, thumbnail_url: e.target.value })}
                        className="bg-gray-800 border-gray-700 flex-1"
                      />
                      <input
                        ref={newCoverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleNewModuleCoverUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => newCoverInputRef.current?.click()}
                        disabled={uploadingCover === "new"}
                        className="border-gray-700"
                      >
                        {uploadingCover === "new" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {newModule.thumbnail_url && (
                      <div className="mt-2">
                        <img 
                          src={newModule.thumbnail_url} 
                          alt="Preview" 
                          className="h-32 w-auto object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={createModule} className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </Button>
                    <Button onClick={() => setShowNewModule(false)} variant="ghost">
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {loadingModules ? (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module, index) => (
                  <div key={module.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    {/* Cover Preview */}
                    <div className="aspect-[9/16] max-h-64 bg-gray-800 relative group">
                      {module.thumbnail_url ? (
                        <img 
                          src={module.thumbnail_url} 
                          alt={module.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCoverUpload(e, module.id)}
                          className="hidden"
                        />
                        <Button
                          size="sm"
                          onClick={() => coverInputRef.current?.click()}
                          disabled={uploadingCover === module.id}
                          className="bg-amber-500 hover:bg-amber-600 text-black"
                        >
                          {uploadingCover === module.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Upload Capa
                        </Button>
                      </div>
                    </div>

                    {/* Module Info */}
                    <div className="p-4">
                      {editingModule?.id === module.id ? (
                        <div className="space-y-3">
                          <Input
                            value={editingModule.title}
                            onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                            className="bg-gray-800 border-gray-700"
                          />
                          <Textarea
                            value={editingModule.description || ""}
                            onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                            className="bg-gray-800 border-gray-700"
                          />
                          <Input
                            placeholder="URL da capa"
                            value={editingModule.thumbnail_url || ""}
                            onChange={(e) => setEditingModule({ ...editingModule, thumbnail_url: e.target.value })}
                            className="bg-gray-800 border-gray-700"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateModule(editingModule)} className="bg-green-600 hover:bg-green-700">
                              <Save className="w-4 h-4 mr-1" />
                              Salvar
                            </Button>
                            <Button size="sm" onClick={() => setEditingModule(null)} variant="ghost">
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-amber-400 text-sm font-medium">Módulo {index + 1}</span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditingModule(module)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteModule(module.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <h3 className="font-bold text-lg">{module.title}</h3>
                          {module.description && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{module.description}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {modules.length === 0 && (
                  <div className="col-span-full text-center py-10 text-gray-500">
                    Nenhum módulo criado ainda
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === "videos" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Vídeos</h2>
              <Button 
                onClick={() => setShowNewVideo(true)} 
                className="bg-amber-500 hover:bg-amber-600 text-black"
                disabled={modules.length === 0}
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Vídeo
              </Button>
            </div>

            {modules.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-yellow-400">Crie um módulo primeiro antes de adicionar vídeos</p>
              </div>
            )}

            {showNewVideo && modules.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
                <h3 className="font-bold mb-4">Adicionar Vídeo</h3>
                <div className="space-y-3">
                  <select
                    value={newVideo.module_id}
                    onChange={(e) => setNewVideo({ ...newVideo, module_id: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2"
                  >
                    <option value="">Selecione o módulo</option>
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Título do vídeo"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                    className="bg-gray-800 border-gray-700"
                  />
                  <Textarea
                    placeholder="Descrição (opcional)"
                    value={newVideo.description}
                    onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                    className="bg-gray-800 border-gray-700"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newVideo.video_type}
                      onChange={(e) => setNewVideo({ ...newVideo, video_type: e.target.value })}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-2"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="upload">Upload direto</option>
                    </select>
                    <Input
                      placeholder="Duração (ex: 10:30)"
                      value={newVideo.duration}
                      onChange={(e) => setNewVideo({ ...newVideo, duration: e.target.value })}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <Input
                    placeholder={newVideo.video_type === "youtube" ? "URL do YouTube" : "URL do vídeo"}
                    value={newVideo.video_url}
                    onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
                    className="bg-gray-800 border-gray-700"
                  />
                  
                  {/* Thumbnail Upload */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Thumbnail</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL da thumbnail ou faça upload"
                        value={newVideo.thumbnail_url}
                        onChange={(e) => setNewVideo({ ...newVideo, thumbnail_url: e.target.value })}
                        className="bg-gray-800 border-gray-700 flex-1"
                      />
                      <input
                        ref={newVideoThumbInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleNewVideoThumbUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => newVideoThumbInputRef.current?.click()}
                        disabled={uploadingVideoThumb === "new"}
                        className="border-gray-700"
                      >
                        {uploadingVideoThumb === "new" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={createVideo} className="bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </Button>
                    <Button onClick={() => setShowNewVideo(false)} variant="ghost">
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {loadingVideos ? (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map(module => {
                  const moduleVideos = videos.filter(v => v.module_id === module.id);
                  const isExpanded = expandedModules.includes(module.id);
                  
                  return (
                    <div key={module.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedModules(prev => 
                          prev.includes(module.id) 
                            ? prev.filter(id => id !== module.id)
                            : [...prev, module.id]
                        )}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-amber-400" />
                          <span className="font-bold">{module.title}</span>
                          <span className="text-gray-500 text-sm">({moduleVideos.length} vídeos)</span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-800 p-4 space-y-3">
                          {moduleVideos.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Nenhum vídeo neste módulo</p>
                          ) : (
                            moduleVideos.map((video, index) => (
                              <div key={video.id} className="bg-gray-800/50 rounded-lg p-3">
                                {editingVideo?.id === video.id ? (
                                  <div className="space-y-3">
                                    <Input
                                      value={editingVideo.title}
                                      onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                                      className="bg-gray-700 border-gray-600"
                                    />
                                    <Textarea
                                      value={editingVideo.description || ""}
                                      onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                                      className="bg-gray-700 border-gray-600"
                                    />
                                    <Input
                                      placeholder="URL do vídeo"
                                      value={editingVideo.video_url}
                                      onChange={(e) => setEditingVideo({ ...editingVideo, video_url: e.target.value })}
                                      className="bg-gray-700 border-gray-600"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => updateVideo(editingVideo)} className="bg-green-600 hover:bg-green-700">
                                        <Save className="w-4 h-4 mr-1" />
                                        Salvar
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingVideo(null)}>
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-gray-500 text-sm">#{index + 1}</span>
                                      {video.thumbnail_url && (
                                        <img 
                                          src={video.thumbnail_url} 
                                          alt={video.title}
                                          className="w-16 h-10 object-cover rounded"
                                        />
                                      )}
                                      <div>
                                        <p className="font-medium">{video.title}</p>
                                        {video.duration && (
                                          <span className="text-xs text-gray-500">{video.duration}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button size="sm" variant="ghost" onClick={() => setEditingVideo(video)}>
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteVideo(video.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Backup Tab */}
        {activeTab === "backup" && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-6">Backup da Área de Membros</h2>
            
            <div className="space-y-6">
              {/* Main Backup */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <Database className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Criar Backup</h3>
                    <p className="text-gray-400 text-sm">Salva todos os módulos, vídeos e usuários em nuvem</p>
                  </div>
                </div>

                {lastBackup && (
                  <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-400">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Último backup: {new Date(lastBackup).toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}

                <Button
                  onClick={createBackup}
                  disabled={backupLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {backupLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Criando backup...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Criar Backup Agora
                    </>
                  )}
                </Button>
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="font-bold text-blue-400 mb-2">Como funciona:</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Os dados são salvos em um local separado na nuvem</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Inclui módulos, vídeos, usuários e pedidos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Backups são armazenados separadamente do conteúdo principal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Recomendamos fazer backup regularmente</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetodoSeguidorAdmin;
