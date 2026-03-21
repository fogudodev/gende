import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useNavigate } from "react-router-dom";
import { LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const ImpersonationBanner = () => {
  const [impersonationData, setImpersonationData] = useState<{ adminEmail: string; adminPassword: string; targetName: string } | null>(null);
  const [returning, setReturning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("admin_impersonation");
    if (stored) {
      try {
        setImpersonationData(JSON.parse(stored));
      } catch {
        localStorage.removeItem("admin_impersonation");
      }
    }

    const handleStorage = () => {
      const data = localStorage.getItem("admin_impersonation");
      setImpersonationData(data ? JSON.parse(data) : null);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (!impersonationData) return null;

  const handleReturn = async () => {
    setReturning(true);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email: impersonationData.adminEmail,
        password: impersonationData.adminPassword,
      });
      if (error) throw error;
      localStorage.removeItem("admin_impersonation");
      setImpersonationData(null);
      toast.success("Voltou para conta admin");
      navigate("/admin/users");
    } catch (err: any) {
      toast.error("Erro ao voltar: " + (err.message || ""));
    } finally {
      setReturning(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
      <ShieldAlert size={16} />
      <span>Você está logado como <strong>{impersonationData.targetName}</strong></span>
      <button
        onClick={handleReturn}
        disabled={returning}
        className="ml-2 px-3 py-1 rounded-lg bg-destructive-foreground/20 hover:bg-destructive-foreground/30 transition-colors flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
      >
        <LogOut size={12} />
        {returning ? "Voltando..." : "Voltar para Admin"}
      </button>
    </div>
  );
};

export default ImpersonationBanner;
