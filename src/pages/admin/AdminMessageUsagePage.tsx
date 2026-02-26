import AdminLayout from "@/components/layout/AdminLayout";
import AdminMessageUsage from "@/components/admin/AdminMessageUsage";

const AdminMessageUsagePage = () => {
  return (
    <AdminLayout title="Uso de Mensagens" subtitle="Consumo de mensagens por profissional">
      <AdminMessageUsage />
    </AdminLayout>
  );
};

export default AdminMessageUsagePage;
