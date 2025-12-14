import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, ArrowLeft, Loader2, MessageCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import logoMro from '@/assets/logo-mro.png';

const ZapMRO = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already authenticated
  useEffect(() => {
    const zapAuth = localStorage.getItem('zapmro_authenticated');
    if (zapAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha usuário e senha',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://mrozap.squareweb.app/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.authenticated) {
        localStorage.setItem('zapmro_authenticated', 'true');
        localStorage.setItem('zapmro_username', username);
        setIsAuthenticated(true);
        
        toast({
          title: 'Acesso VIP concedido! 👑',
          description: 'Bem-vindo à área ZAPMRO'
        });
      } else {
        toast({
          title: 'Credenciais inválidas',
          description: data.message || 'Verifique usuário e senha',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('zapmro_authenticated');
    localStorage.removeItem('zapmro_username');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  // Authenticated member area
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900">
        {/* Header */}
        <header className="bg-green-900/80 backdrop-blur-sm border-b border-green-700/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="p-2 rounded-lg bg-green-800/50 hover:bg-green-700/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-green-300" />
              </button>
              <div className="flex items-center gap-3">
                <img src={logoMro} alt="MRO" className="h-10" />
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-white">ZAPMRO</h1>
                  <p className="text-xs text-green-300">Área de Membros</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-800/50 border border-green-600/30">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">
                  {localStorage.getItem('zapmro_username')}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-green-600/50 text-green-300 hover:bg-green-700/50 hover:text-white"
              >
                Sair
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold mb-4">
              <MessageCircle className="w-4 h-4" />
              ZAPMRO
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Bem-vindo à <span className="text-green-400">Área VIP</span>
            </h2>
            <p className="text-green-200/80 text-lg max-w-2xl mx-auto">
              Acesse todas as ferramentas de automação para WhatsApp
            </p>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Placeholder cards - will be customized by admin */}
            <div className="bg-green-800/30 backdrop-blur-sm border border-green-600/30 rounded-2xl p-6 hover:bg-green-800/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Conteúdo em breve</h3>
              <p className="text-green-300/70">
                A área de membros ZAPMRO está sendo configurada pelo administrador.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Back button */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 p-3 rounded-xl bg-green-800/50 hover:bg-green-700/50 transition-colors z-10"
      >
        <ArrowLeft className="w-5 h-5 text-green-300" />
      </button>

      {/* Login Card */}
      <div className="w-full max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-green-200">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={logoMro} alt="MRO" className="h-16 mx-auto mb-4" />
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold mb-4">
              ZAPMRO
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Acesso VIP 👑</h1>
            <p className="text-gray-500 mt-2">Entre com suas credenciais</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Usuário VIP"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha de Acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  🔓 ACESSAR
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-green-300/60 text-sm z-10">
        Mais Resultados Online © 2024
      </p>
    </div>
  );
};

export default ZapMRO;
