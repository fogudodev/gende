import AdminLayout from "@/components/layout/AdminLayout";
import AdminWhatsAppLogs from "@/components/admin/AdminWhatsAppLogs";

const AdminWhatsAppLogsPage = () => {
  return (
    <AdminLayout title="Log de WhatsApp" subtitle="Histórico de mensagens enviadas">
      <AdminWhatsAppLogs />
    </AdminLayout>
  );
};

export default AdminWhatsAppLogsPage;
