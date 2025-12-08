import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, User, Lock, Clock } from 'lucide-react';
import { loginToSquare } from '@/lib/squareApi';
import { loginUser, getUserSession } from '@/lib/userStorage';
import { formatDaysRemaining, isLifetimeAccess } from '@/types/user';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/Logo';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: 'Preencha todos os campos',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginToSquare(username.trim(), password.trim());

      if (result.success) {
        loginUser(username.trim(), result.daysRemaining || 365);
        
        const daysText = formatDaysRemaining(result.daysRemaining || 365);
        const isLifetime = isLifetimeAccess(result.daysRemaining || 365);
        
        toast({
          title: 'Login realizado com sucesso!',
          description: isLifetime 
            ? 'Acesso vitalício ativado' 
            : `Você tem ${daysText} de acesso`,
        });

        onLoginSuccess();
      } else {
        toast({
          title: 'Erro no login',
          description: result.error || 'Usuário ou senha incorretos',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível conectar ao servidor',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold">Acesso MRO Inteligente</CardTitle>
          <CardDescription>
            Digite suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Seu nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="bg-background/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-background/50"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Após login, você verá seus dias de acesso</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
