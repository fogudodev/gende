import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-circle.png";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={logo} alt="Logo" className="h-8 w-8" />
          <h1 className="text-lg font-semibold">Política de Privacidade</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <p className="text-muted-foreground text-sm">Última atualização: 12 de março de 2026</p>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">1. Introdução</h2>
          <p className="text-muted-foreground leading-relaxed">
            A presente Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as informações pessoais dos usuários da nossa plataforma de gestão para profissionais de beleza e estética. Estamos comprometidos com a transparência e a proteção dos seus dados, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">2. Dados Coletados</h2>
          <p className="text-muted-foreground leading-relaxed">Coletamos os seguintes tipos de informações:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li><strong className="text-foreground">Dados de Cadastro:</strong> nome, e-mail, telefone, nome do estabelecimento.</li>
            <li><strong className="text-foreground">Dados de Clientes:</strong> nome, telefone, e-mail e notas dos clientes cadastrados pelo profissional.</li>
            <li><strong className="text-foreground">Dados de Agendamento:</strong> horários, serviços, valores e status de agendamentos.</li>
            <li><strong className="text-foreground">Dados Financeiros:</strong> transações, pagamentos, comissões e despesas registradas.</li>
            <li><strong className="text-foreground">Dados de Uso:</strong> interações com a plataforma, preferências e configurações.</li>
            <li><strong className="text-foreground">Dados de Integração:</strong> tokens de acesso para integrações autorizadas (WhatsApp, Instagram, Google Calendar).</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">3. Finalidade do Tratamento</h2>
          <p className="text-muted-foreground leading-relaxed">Utilizamos seus dados para:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Prestação dos serviços da plataforma (agendamentos, finanças, automações).</li>
            <li>Comunicação com clientes (lembretes, campanhas, follow-ups).</li>
            <li>Melhoria contínua da experiência e funcionalidades.</li>
            <li>Cumprimento de obrigações legais e regulatórias.</li>
            <li>Análise estatística e relatórios de desempenho.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">4. Compartilhamento de Dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Seus dados não são vendidos a terceiros. Podemos compartilhar informações com:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li><strong className="text-foreground">Provedores de infraestrutura</strong> para hospedagem e processamento seguro.</li>
            <li><strong className="text-foreground">Serviços de pagamento</strong> para processamento de transações (ex: Stripe).</li>
            <li><strong className="text-foreground">Integrações autorizadas</strong> pelo usuário (Meta, Google).</li>
            <li><strong className="text-foreground">Autoridades competentes</strong> quando exigido por lei.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">5. Armazenamento e Segurança</h2>
          <p className="text-muted-foreground leading-relaxed">
            Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito (TLS), controle de acesso baseado em funções (RLS), autenticação segura e backups regulares. Seus dados são armazenados em servidores seguros com conformidade internacional.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">6. Direitos do Titular</h2>
          <p className="text-muted-foreground leading-relaxed">Conforme a LGPD, você tem direito a:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Acessar seus dados pessoais.</li>
            <li>Corrigir dados incompletos ou inexatos.</li>
            <li>Solicitar a exclusão de dados desnecessários.</li>
            <li>Revogar consentimento a qualquer momento.</li>
            <li>Solicitar portabilidade dos dados.</li>
            <li>Obter informações sobre o compartilhamento dos seus dados.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">7. Cookies e Tecnologias</h2>
          <p className="text-muted-foreground leading-relaxed">
            Utilizamos cookies e tecnologias similares para manter sua sessão ativa, salvar preferências e melhorar a experiência de uso. Você pode gerenciar cookies nas configurações do seu navegador.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">8. Retenção de Dados</h2>
          <p className="text-muted-foreground leading-relaxed">
            Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para cumprir obrigações legais. Após o encerramento da conta, os dados serão excluídos ou anonimizados em até 90 dias, salvo exigência legal.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">9. Alterações nesta Política</h2>
          <p className="text-muted-foreground leading-relaxed">
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas através da plataforma ou por e-mail. O uso continuado da plataforma após as alterações constitui aceitação da nova política.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">10. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para dúvidas, solicitações ou reclamações relacionadas à privacidade, entre em contato através do nosso chat de suporte dentro da plataforma ou pelo e-mail disponível na página de contato.
          </p>
        </section>

        <div className="pt-8 border-t border-border">
          <Button variant="outline" onClick={() => navigate("/landing")}>
            Voltar para a página inicial
          </Button>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
