import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Instagram, MessageCircle, Home } from "lucide-react";

const AreaDeMembros = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo */}
        <Logo size="xl" />

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground text-center">
          Área de Membros
        </h1>

        {/* Member Area Buttons */}
        <div className="w-full flex flex-col gap-4">
          <Link to="/instagram" className="w-full">
            <Button 
              variant="gradient" 
              size="xl" 
              className="w-full gap-3"
            >
              <Instagram className="h-6 w-6" />
              Ferramenta para Instagram
            </Button>
          </Link>

          <Link to="/zapmro" className="w-full">
            <Button 
              variant="glow" 
              size="xl" 
              className="w-full gap-3 bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-6 w-6" />
              Ferramenta para WhatsApp
            </Button>
          </Link>
        </div>

        {/* Footer Links */}
        <div className="flex flex-col items-center gap-4 mt-8">
          <a 
            href="https://maisresultadosonline.com.br" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>Página Inicial</span>
          </a>

          <a 
            href="https://instagram.com/maisresultadosonline" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <Instagram className="h-5 w-5" />
            <span>@maisresultadosonline</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AreaDeMembros;
