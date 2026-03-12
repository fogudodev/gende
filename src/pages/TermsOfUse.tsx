import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-circle.png";

const TermsOfUse = () => {
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
          <h1 className="text-lg font-semibold">Termos de Uso</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <p className="text-muted-foreground text-sm">Última atualização: 12 de março de 2026</p>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">1. Aceitação dos Termos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ao acessar ou utilizar nossa plataforma de gestão para profissionais de beleza e estética, você concorda com estes Termos de Uso. Caso não concorde com algum dos termos, solicitamos que não utilize a plataforma.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">2. Descrição do Serviço</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nossa plataforma oferece ferramentas de gestão para profissionais da beleza, incluindo:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Agendamento online e gestão de horários.</li>
            <li>Gestão de clientes e histórico de atendimentos.</li>
            <li>Controle financeiro, comissões e caixa.</li>
            <li>Automação de comunicações via WhatsApp e Instagram.</li>
            <li>Campanhas de marketing e fidelização.</li>
            <li>Página pública de agendamento.</li>
            <li>Relatórios e análises de desempenho.</li>
            <li>Gestão de equipe e funcionários.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">3. Cadastro e Conta</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Você deve fornecer informações verdadeiras, completas e atualizadas no cadastro.</li>
            <li>Você é responsável pela segurança da sua conta e senha.</li>
            <li>Cada conta é pessoal e intransferível.</li>
            <li>Menores de 18 anos devem ter autorização de responsável legal.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">4. Planos e Pagamentos</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>A plataforma oferece diferentes planos de assinatura com funcionalidades e limites específicos.</li>
            <li>Os pagamentos são processados de forma segura através de processadores de pagamento terceiros.</li>
            <li>O cancelamento pode ser feito a qualquer momento, com acesso mantido até o final do período pago.</li>
            <li>Não realizamos reembolsos de períodos parcialmente utilizados, salvo exceções previstas em lei.</li>
            <li>Os preços podem ser alterados com aviso prévio de 30 dias.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">5. Uso Aceitável</h2>
          <p className="text-muted-foreground leading-relaxed">Você concorda em NÃO:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Utilizar a plataforma para atividades ilícitas ou não autorizadas.</li>
            <li>Enviar mensagens em massa (spam) que violem regulamentações.</li>
            <li>Tentar acessar áreas restritas ou dados de outros usuários.</li>
            <li>Reproduzir, modificar ou distribuir o software da plataforma.</li>
            <li>Utilizar robôs, scrapers ou ferramentas automatizadas não autorizadas.</li>
            <li>Compartilhar credenciais de acesso com terceiros.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">6. Responsabilidade sobre Conteúdo</h2>
          <p className="text-muted-foreground leading-relaxed">
            O profissional é responsável por todo o conteúdo inserido na plataforma, incluindo dados de clientes, mensagens de campanhas, informações da página pública e dados financeiros. A plataforma não se responsabiliza por informações incorretas inseridas pelo usuário.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">7. Integrações com Terceiros</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ao conectar serviços de terceiros (WhatsApp Business, Instagram, Google Calendar, Stripe), você aceita também os termos de uso dessas plataformas. Não nos responsabilizamos por alterações, falhas ou indisponibilidade desses serviços externos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">8. Disponibilidade do Serviço</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência quando possível. Não nos responsabilizamos por perdas decorrentes de indisponibilidade temporária.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">9. Propriedade Intelectual</h2>
          <p className="text-muted-foreground leading-relaxed">
            Todos os direitos de propriedade intelectual da plataforma, incluindo código, design, marca, ícones e conteúdo original, pertencem exclusivamente à empresa. O uso da plataforma não concede qualquer direito de propriedade intelectual sobre ela.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">10. Limitação de Responsabilidade</h2>
          <p className="text-muted-foreground leading-relaxed">
            A plataforma é fornecida "como está". Não nos responsabilizamos por danos indiretos, incidentais ou consequenciais resultantes do uso ou impossibilidade de uso da plataforma, incluindo perda de receita, dados ou oportunidades de negócio, nos limites permitidos por lei.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">11. Suspensão e Encerramento</h2>
          <p className="text-muted-foreground leading-relaxed">
            Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos, pratiquem atividades ilegais ou prejudiquem outros usuários. Em caso de encerramento, o usuário será notificado e terá prazo para exportar seus dados.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">12. Alterações nos Termos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Podemos modificar estes Termos a qualquer momento. Mudanças significativas serão comunicadas com antecedência de 15 dias. O uso continuado da plataforma após as alterações implica na aceitação dos novos termos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">13. Legislação Aplicável</h2>
          <p className="text-muted-foreground leading-relaxed">
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca do domicílio do usuário, conforme previsto no Código de Defesa do Consumidor.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">14. Contato</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para dúvidas sobre estes Termos de Uso, entre em contato através do nosso chat de suporte dentro da plataforma ou pelo e-mail disponível na página de contato.
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

export default TermsOfUse;
