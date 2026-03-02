import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useIsSupport } from "@/hooks/useAdmin";

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: isSupport, isLoading: supportLoading } = useIsSupport();

  if (loading || adminLoading || supportLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin && !isSupport) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default AdminRoute;
