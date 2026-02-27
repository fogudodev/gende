import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Bookings from "./pages/Bookings";
import Services from "./pages/Services";
import Clients from "./pages/Clients";
import Automations from "./pages/Automations";
import Finance from "./pages/Finance";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import PublicPage from "./pages/PublicPage";
import PublicBooking from "./pages/PublicBooking";
import Team from "./pages/Team";
import Products from "./pages/Products";
import Coupons from "./pages/Coupons";
import PaymentSettings from "./pages/PaymentSettings";
import Reviews from "./pages/Reviews";
import CommissionReport from "./pages/CommissionReport";
import TeamPerformance from "./pages/TeamPerformance";
import Campaigns from "./pages/Campaigns";
import PaymentChat from "./pages/PaymentChat";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminSubscribers from "./pages/admin/AdminSubscribers";
import AdminIntegrations from "./pages/admin/AdminIntegrations";
import AdminFeatures from "./pages/admin/AdminFeatures";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminWhatsAppPage from "./pages/admin/AdminWhatsAppPage";
import AdminWhatsAppLogsPage from "./pages/admin/AdminWhatsAppLogsPage";
import AdminPlanLimits from "./pages/admin/AdminPlanLimits";
import AdminProfessionalLimits from "./pages/admin/AdminProfessionalLimits";
import AdminMessageUsagePage from "./pages/admin/AdminMessageUsagePage";
import AdminLogsPage from "./pages/admin/AdminLogsPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              
              {/* Professional routes */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/automations" element={<ProtectedRoute><Automations /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/public-page" element={<ProtectedRoute><PublicPage /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
              <Route path="/payment-settings" element={<ProtectedRoute><PaymentSettings /></ProtectedRoute>} />
              <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
              <Route path="/commission-report" element={<ProtectedRoute><CommissionReport /></ProtectedRoute>} />
              <Route path="/team-performance" element={<ProtectedRoute><TeamPerformance /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
              <Route path="/payment-chat" element={<ProtectedRoute><PaymentChat /></ProtectedRoute>} />

              {/* Admin Master routes */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/plans" element={<AdminRoute><AdminPlans /></AdminRoute>} />
              <Route path="/admin/subscribers" element={<AdminRoute><AdminSubscribers /></AdminRoute>} />
              <Route path="/admin/integrations" element={<AdminRoute><AdminIntegrations /></AdminRoute>} />
              <Route path="/admin/features" element={<AdminRoute><AdminFeatures /></AdminRoute>} />
              <Route path="/admin/bookings" element={<AdminRoute><AdminBookings /></AdminRoute>} />
              <Route path="/admin/whatsapp" element={<AdminRoute><AdminWhatsAppPage /></AdminRoute>} />
              <Route path="/admin/whatsapp-logs" element={<AdminRoute><AdminWhatsAppLogsPage /></AdminRoute>} />
              <Route path="/admin/plan-limits" element={<AdminRoute><AdminPlanLimits /></AdminRoute>} />
              <Route path="/admin/professional-limits" element={<AdminRoute><AdminProfessionalLimits /></AdminRoute>} />
              <Route path="/admin/message-usage" element={<AdminRoute><AdminMessageUsagePage /></AdminRoute>} />
              <Route path="/admin/logs" element={<AdminRoute><AdminLogsPage /></AdminRoute>} />

              {/* Public routes */}
              <Route path="/p/:slug" element={<PublicBooking />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
