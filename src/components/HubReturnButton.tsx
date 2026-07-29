import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearHubReturn, shouldReturnToHub, HUB_DASHBOARD_ROUTE } from "@/lib/hubReturn";

/**
 * Botão flutuante "Voltar ao Dashboard".
 *
 * Só aparece quando a ferramenta foi aberta a partir do hub (/dashboard),
 * garantindo que o cliente sempre consiga retornar para a área de membros
 * independentemente da navegação interna de cada produto.
 */
export default function HubReturnButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onDashboard = location.pathname.startsWith(HUB_DASHBOARD_ROUTE);
    if (onDashboard) {
      // Já está no hub: a marcação deixa de ser necessária.
      clearHubReturn();
      setVisible(false);
      return;
    }
    setVisible(shouldReturnToHub());
  }, [location.pathname]);

  if (!visible) return null;

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => {
        clearHubReturn();
        navigate(HUB_DASHBOARD_ROUTE);
      }}
      className="fixed bottom-4 left-4 z-[9999] shadow-lg border border-border"
      aria-label="Voltar ao Dashboard"
    >
      <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
    </Button>
  );
}
