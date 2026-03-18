import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useProfessional } from "@/hooks/useProfessional";
import { applySystemColors } from "@/pages/Settings";
import { useBookingNotifications } from "@/hooks/useBookingNotifications";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: professional } = useProfessional();

  useEffect(() => {
    if (professional) {
      applySystemColors(
        (professional as any).system_accent_color,
        (professional as any).system_sidebar_color,
        (professional as any).system_sidebar_text_color
      );
    }
  }, [professional]);

  // Listen for new bookings and notify
  useBookingNotifications({
    professionalId: professional?.id,
    enabled: !!professional?.id,
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="md:ml-[72px] transition-all duration-300 pb-20 md:pb-0">
        <TopBar title={title} subtitle={subtitle} onMenuClick={() => setMobileOpen(true)} />
        <main className="p-3 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
