import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api-client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const InstagramCallback = () => {
  const [searchParams] = useSearchParams();
  const hasProcessedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando Instagram...");

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setMessage("Código de autorização não encontrado.");
      return;
    }

    const exchange = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: "instagram_oauth_code", code }, "*");
            setStatus("loading");
            setMessage("Finalizando conexão na aba principal...");
            setTimeout(() => window.close(), 1200);
            return;
          }

          setStatus("error");
          setMessage("Sessão não encontrada. Por favor, faça login e tente novamente.");
          return;
        }

        const redirectUri = `${window.location.origin}/instagram-callback`;
        const { data, error } = await supabase.functions.invoke("instagram-oauth", {
          body: { action: "exchange_code", code, redirect_uri: redirectUri },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          let errorMessage = error.message || "Erro desconhecido";
          const response = (error as { context?: Response }).context;

          if (response instanceof Response) {
            const payload = await response.clone().json().catch(() => null);
            if (payload?.error && typeof payload.error === "string") {
              errorMessage = payload.error;
            }
          }

          throw new Error(errorMessage);
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        setStatus("success");
        setMessage(`Instagram conectado com sucesso! @${data.username || ""}`);

        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (err: any) {
        console.error("Instagram callback error:", err);
        setStatus("error");
        setMessage(err.message || "Erro ao conectar Instagram.");
      }
    };

    exchange();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === "loading" && <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />}
        {status === "success" && <CheckCircle className="w-8 h-8 text-primary mx-auto" />}
        {status === "error" && <XCircle className="w-8 h-8 text-destructive mx-auto" />}
        <p className="text-muted-foreground">{message}</p>
        {status !== "loading" && (
          <p className="text-sm text-muted-foreground">Você pode fechar esta aba e voltar à página de automações.</p>
        )}
      </div>
    </div>
  );
};

export default InstagramCallback;
