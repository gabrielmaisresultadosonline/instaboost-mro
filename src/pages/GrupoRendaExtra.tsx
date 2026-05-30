import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GrupoRendaExtra = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("renda-extra-v2-admin", {
          body: { action: "getGroupLink" },
        });
        if (fnErr) throw fnErr;
        const link = data?.whatsapp_group_link;
        if (link && typeof link === "string") {
          window.location.replace(link);
        } else {
          setError("O link do grupo ainda não foi configurado. Tente novamente em alguns minutos.");
        }
      } catch (e) {
        console.error(e);
        setError("Não foi possível carregar o link do grupo. Tente novamente.");
      }
    })();
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
      fontFamily: "Arial, sans-serif",
      padding: "20px",
      textAlign: "center",
    }}>
      <div style={{
        background: "#fff",
        padding: "40px 30px",
        borderRadius: "16px",
        maxWidth: "440px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
      }}>
        <div style={{
          background: "#000",
          color: "#fff",
          display: "inline-block",
          padding: "8px 20px",
          borderRadius: "8px",
          fontSize: "26px",
          fontWeight: "bold",
          letterSpacing: "2px",
          marginBottom: "20px",
        }}>MRO</div>
        {error ? (
          <>
            <h2 style={{ margin: "0 0 10px", color: "#c0392b" }}>Ops!</h2>
            <p style={{ color: "#444", fontSize: "15px" }}>{error}</p>
          </>
        ) : (
          <>
            <h2 style={{ margin: "0 0 10px", color: "#000", fontSize: "20px" }}>
              📲 Redirecionando para o grupo...
            </h2>
            <p style={{ color: "#555", fontSize: "14px" }}>
              Aguarde, estamos te levando para o grupo do WhatsApp.
            </p>
            <div style={{
              margin: "25px auto 0",
              width: "32px",
              height: "32px",
              border: "4px solid #FFD700",
              borderTopColor: "#000",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </>
        )}
      </div>
    </div>
  );
};

export default GrupoRendaExtra;
