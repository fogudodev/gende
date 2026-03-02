import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin, useIsSupport } from "@/hooks/useAdmin";

// Routes support users can access
const SUPPORT_ALLOWED_ROUTES = [
  "/admin",
  "/admin/users",
  "/admin/plans",
  "/admin/subscribers",
  "/admin/integrations",
  "/admin/features",
  "/admin/bookings",
  "/admin/whatsapp",
  "/admin/professional-limits",
  "/admin/message-usage",
  "/admin/support-chat",
  "/admin/payment-chat",
  "/admin/logs",
  "/admin/platform-reviews",
];

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: isSupport, isLoading: supportLoading } = useIsSupport();
  const location = useLocation();

  if (loading || adminLoading || supportLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin && !isSupport) return <Navigate to="/" replace />;

  // Support users can only access specific routes
  if (isSupport && !isAdmin && !SUPPORT_ALLOWED_ROUTES.includes(location.pathname)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
