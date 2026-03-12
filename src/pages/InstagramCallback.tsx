import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const InstagramCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Conectando Instagram...");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setMessage("Código de autorização não encontrado.");
      return;
    }

    const exchange = async () => {
      try {
        // Wait for session to be available
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          setStatus("error");
          setMessage("Sessão não encontrada. Por favor, faça login e tente novamente.");
          return;
        }

        const redirectUri = `${window.location.origin}/instagram-callback`;
        const { data, error } = await supabase.functions.invoke("instagram-oauth", {
          body: { action: "exchange_code", code, redirect_uri: redirectUri },
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || "Erro desconhecido");
        }

        setStatus("success");
        setMessage(`Instagram conectado com sucesso! @${data.username || ""}`);

        // Close this tab after a delay, the original tab will refresh
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
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === "loading" && (
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        )}
        {status === "success" && (
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
        )}
        {status === "error" && (
          <XCircle className="w-8 h-8 text-red-500 mx-auto" />
        )}
        <p className="text-muted-foreground">{message}</p>
        {status !== "loading" && (
          <p className="text-sm text-muted-foreground">
            Você pode fechar esta aba e voltar à página de automações.
          </p>
        )}
      </div>
    </div>
  );
};

export default InstagramCallback;
