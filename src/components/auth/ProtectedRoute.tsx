import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfessional } from "@/hooks/useProfessional";
import { ShieldAlert } from "lucide-react";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const { data: professional, isLoading: profLoading } = useProfessional();

  if (loading || profLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (professional?.is_blocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} className="text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Conta Bloqueada</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta foi suspensa pelo administrador.
            {professional.blocked_reason && (
              <> Motivo: <span className="text-foreground font-medium">{professional.blocked_reason}</span></>
            )}
          </p>
          <button
            onClick={() => signOut()}
            className="px-6 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
