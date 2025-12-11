import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, RefreshCw, Shield } from 'lucide-react';

interface AgeRestrictionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  onRetrySync?: () => void;
}

export const AgeRestrictionDialog = ({ 
  isOpen, 
  onClose, 
  username,
  onRetrySync 
}: AgeRestrictionDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-background border-destructive/30">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/20">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl text-foreground">
                Perfil com Restrição de Idade
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                @{username}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  Este perfil está configurado como 18+ no Instagram
                </p>
                <p className="text-sm text-muted-foreground">
                  O Instagram não permite acessar dados de perfis com restrição de idade via API.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">
                ?
              </span>
              Como resolver:
            </h4>
            
            <div className="space-y-3 pl-2">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                  1
                </span>
                <div>
                  <p className="text-sm text-foreground">
                    Abra o <strong>Instagram</strong> no celular ou navegador
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                  2
                </span>
                <div>
                  <p className="text-sm text-foreground">
                    Vá em <strong>Configurações</strong> → <strong>Conta</strong> → <strong>Conteúdo Sensível</strong>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                  3
                </span>
                <div>
                  <p className="text-sm text-foreground">
                    Desative a opção <strong>"Conta com restrição de idade"</strong>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                  4
                </span>
                <div>
                  <p className="text-sm text-foreground">
                    Aguarde alguns minutos e <strong>sincronize novamente</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Nota:</strong> Perfis públicos sem restrição de idade são sincronizados automaticamente. 
              Se o problema persistir após desativar a restrição, aguarde até 1 hora para as mudanças propagarem.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {onRetrySync && (
            <Button onClick={onRetrySync} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Sincronizar Novamente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
