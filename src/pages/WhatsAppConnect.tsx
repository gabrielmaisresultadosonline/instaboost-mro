import { useEffect, useMemo, useState } from "react";

type ApiStatus = "checking" | "online" | "offline";

const WhatsAppConnect = () => {
  const [status, setStatus] = useState<ApiStatus>("checking");

  const statusLabel = useMemo(() => {
    if (status === "online") return "Backend online";
    if (status === "offline") return "Backend offline";
    return "Verificando backend...";
  }, [status]);

  useEffect(() => {
    document.title = "WhatsApp Multi Connect | MRO";

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/whatsapp-api/", { method: "GET" });
        if (cancelled) return;
        setStatus(res.ok ? "online" : "offline");
      } catch {
        if (cancelled) return;
        setStatus("offline");
      }
    };

    check();
    const t = window.setInterval(check, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-sm font-semibold">WhatsApp Multi Connect</h1>
          <div className="flex items-center gap-2">
            <span
              className={
                "rounded-full px-3 py-1 text-xs font-medium " +
                (status === "online"
                  ? "bg-primary text-primary-foreground"
                  : status === "offline"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-muted text-muted-foreground")
              }
            >
              {statusLabel}
            </span>
            <a
              href="/whatsapp-api/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline"
            >
              Abrir /whatsapp-api/
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-3">
        {status === "offline" && (
          <div className="mb-3 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
            Não consegui acessar <code>/whatsapp-api/</code>. Na VPS isso normalmente é:
            <ul className="mt-2 list-disc pl-5">
              <li>PM2 não instalado/rodando o processo</li>
              <li>Nginx sem proxy para <code>/whatsapp-api/</code> na porta 3001</li>
            </ul>
          </div>
        )}
      </section>

      <section className="h-[calc(100vh-120px)]">
        <iframe
          src="/whatsapp-api/"
          className="h-full w-full border-0"
          title="WhatsApp Multi Connect"
          allow="camera; microphone"
        />
      </section>
    </main>
  );
};

export default WhatsAppConnect;
