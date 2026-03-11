import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useInstagramConnect } from "@/hooks/useInstagram";
import { Loader2 } from "lucide-react";

const InstagramCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { exchangeCode } = useInstagramConnect();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) {
      exchangeCode.mutate(code, {
        onSuccess: () => navigate("/instagram-automation"),
        onError: () => navigate("/instagram-automation"),
      });
    } else {
      navigate("/instagram-automation");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Conectando Instagram...</p>
      </div>
    </div>
  );
};

export default InstagramCallback;
