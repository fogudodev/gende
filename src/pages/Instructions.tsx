import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useProfessional } from "@/hooks/useProfessional";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PlanId } from "@/lib/stripe-plans";

import dashboardIcon from "@/assets/icon-dashboard.png";
import calendarIcon from "@/assets/icon-calendar.png";
import scissorsIcon from "@/assets/icon-scissors.png";
import clientsIcon from "@/assets/icon-clients.png";
import automationsIcon from "@/assets/icon-automations.png";
import campaignsIcon from "@/assets/icon-campaigns.png";
import paymentChatIcon from "@/assets/icon-payment-chat.png";
import supportChatIcon from "@/assets/icon-support-chat.png";
import aiIcon from "@/assets/icon-ai.png";
import financeIcon from "@/assets/icon-finance.png";
import cashRegisterIcon from "@/assets/icon-cash-register.png";
import publicPageIcon from "@/assets/icon-public-page.png";
import productsIcon from "@/assets/icon-products.png";
import couponsIcon from "@/assets/icon-coupons.png";
import reportsIcon from "@/assets/icon-reports.png";
import reviewsIcon from "@/assets/icon-reviews.png";
import teamIcon from "@/assets/icon-team.png";
import commissionIcon from "@/assets/icon-commission.png";
import performanceIcon from "@/assets/icon-performance.png";
import settingsIcon from "@/assets/icon-settings.png";

const InstructionIcon = ({ src, size = 20, className = "" }: { src: string; size?: number; className?: string }) => (
  <img src={src} alt="" width={size} height={size} className={`inline-block brightness-0 opacity-75 dark:invert dark:opacity-90 ${className}`} />
);

interface InstructionSection {
  id: string;
  title: string;
  icon: string;
  plans: Array<PlanId | "all">;
  steps: string[];
  tips?: string[];
}

const allSections: InstructionSection[] = [
  {
    id: "dashboard",
    title: "Dashboard (Painel Inicial)",
    icon: dashboardIcon,
    plans: ["all"],
    steps: [
      "Ao fazer login, você será direcionado automaticamente para o Dashboard.",
      "No topo da tela, você verá um resumo com os números mais importantes do seu negócio: total de agendamentos do mês, clientes atendidos, receita gerada e taxa de ocupação.",
      "Cada número aparece dentro de um cartão colorido. Passe o mouse sobre eles para ver mais detalhes.",
      "Abaixo dos cartões, você encontra gráficos que mostram sua receita ao longo do tempo e a distribuição dos agendamentos.",
      "No celular, o dashboard mostra uma visão simplificada do dia: próximo atendimento, alertas pendentes e botões de ação rápida para criar agendamento, adicionar cliente e abrir o caixa.",
      "Use o menu lateral (barra à esquerda no computador, ou o ícone ☰ no celular) para navegar para outras telas do sistema.",
    ],
    tips: [
      "Acesse o dashboard diariamente para acompanhar o desempenho do seu negócio.",
      "No celular, deslize para baixo para ver a linha do tempo completa do dia.",
    ],
  },
  {
    id: "bookings",
    title: "Agendamentos",
    icon: calendarIcon,
    plans: ["all"],
    steps: [
      "Clique em \"Agendamentos\" no menu lateral para acessar sua agenda.",
      "Você verá um calendário com todos os seus compromissos. Cada agendamento aparece como um bloco colorido no horário correspondente.",
      "Para CRIAR um novo agendamento: clique no botão \"+ Novo Agendamento\" (geralmente no canto superior direito). Um formulário será aberto.",
      "No formulário de agendamento, preencha: Nome do cliente (ou selecione um já cadastrado), Telefone, Serviço desejado (selecione da lista), Data e Horário.",
      "Após preencher todos os campos, clique em \"Salvar\" ou \"Confirmar\" para registrar o agendamento.",
      "Para EDITAR um agendamento existente: clique sobre ele no calendário. Os detalhes serão exibidos e você poderá alterar informações ou mudar o status.",
      "Os status possíveis são: Confirmado, Pendente, Concluído, Cancelado e Não compareceu.",
      "Para CANCELAR um agendamento: abra o agendamento e clique na opção de cancelar. Confirme a ação quando solicitado.",
      "Use os filtros de data na parte superior para navegar entre dias, semanas ou meses.",
      "Se um profissional/funcionário está vinculado, você pode filtrar a agenda por profissional.",
    ],
    tips: [
      "Sempre confirme o telefone do cliente para que os lembretes automáticos por WhatsApp funcionem corretamente.",
      "Agendamentos cancelados ficam registrados para consulta futura — nada é perdido.",
      "Você pode ver rapidamente os horários livres olhando os espaços vazios no calendário.",
    ],
  },
  {
    id: "waitlist",
    title: "Lista de Espera",
    icon: calendarIcon,
    plans: ["all"],
    steps: [
      "Acesse \"Lista de Espera\" no menu lateral.",
      "Esta tela serve para registrar clientes que desejam ser atendidos mas não encontraram horário disponível.",
      "Clique em \"+ Adicionar à Lista\" para incluir um novo registro.",
      "Preencha: Nome do cliente, Telefone, Serviço desejado, Data preferida e Período preferido (manhã, tarde ou noite).",
      "Quando um horário ficar disponível, você pode notificar o cliente diretamente pela lista — clique no botão de notificação ao lado do nome.",
      "Após agendar o cliente, altere o status dele na lista de espera para \"Agendado\" ou remova-o.",
    ],
    tips: [
      "Use a lista de espera para não perder clientes quando a agenda estiver lotada.",
      "Verifique a lista regularmente, especialmente quando houver cancelamentos.",
    ],
  },
  {
    id: "services",
    title: "Serviços",
    icon: scissorsIcon,
    plans: ["all"],
    steps: [
      "Clique em \"Serviços\" no menu lateral para gerenciar todos os serviços que você oferece.",
      "Você verá a lista completa dos seus serviços, cada um mostrando: nome, preço, duração e se está ativo ou não.",
      "Para CRIAR um novo serviço: clique no botão \"+ Novo Serviço\".",
      "Preencha os campos: Nome do serviço (ex: \"Corte Masculino\"), Preço (ex: R$ 45,00), Duração em minutos (ex: 30), Descrição (opcional) e Categoria (opcional).",
      "O campo \"Intervalo de Manutenção\" (dias) é opcional e serve para sugerir ao cliente quando ele deve retornar.",
      "Clique em \"Salvar\" para criar o serviço.",
      "Para EDITAR um serviço: clique no ícone de edição (lápis) ao lado do serviço desejado.",
      "Para DESATIVAR um serviço (sem excluí-lo): desmarque a opção \"Ativo\". Ele deixará de aparecer na página pública de agendamento, mas continuará no histórico.",
      "Você pode REORDENAR os serviços arrastando-os pela posição desejada — isso afeta a ordem na página pública.",
    ],
    tips: [
      "Mantenha os preços e durações sempre atualizados para evitar confusão nos agendamentos.",
      "Serviços desativados não aparecem para clientes, mas podem ser reativados a qualquer momento.",
      "Use categorias para organizar melhor seus serviços (ex: \"Cabelo\", \"Barba\", \"Tratamentos\").",
    ],
  },
  {
    id: "clients",
    title: "Clientes",
    icon: clientsIcon,
    plans: ["all"],
    steps: [
      "Acesse \"Clientes\" no menu lateral para ver todos os seus clientes cadastrados.",
      "A tela exibe uma lista com nome, telefone, e-mail e data de cadastro de cada cliente.",
      "Use a barra de busca no topo para encontrar clientes rapidamente pelo nome ou telefone.",
      "Para ADICIONAR um novo cliente: clique em \"+ Novo Cliente\".",
      "Preencha: Nome completo, Telefone (com DDD, ex: 11999998888), E-mail (opcional) e Observações (opcional — use para anotar preferências do cliente).",
      "Clique em \"Salvar\" para cadastrar.",
      "Para EDITAR um cliente: clique no nome dele ou no ícone de edição.",
      "Ao abrir um cliente, você pode ver o histórico completo de agendamentos dele.",
      "Clientes também são criados automaticamente quando você faz um agendamento com um número novo.",
    ],
    tips: [
      "Sempre registre o telefone com DDD para que o WhatsApp funcione corretamente.",
      "Use o campo de observações para anotar alergias, preferências de horário ou qualquer detalhe importante.",
      "Clientes inativos (que não agendam há muito tempo) podem ser filtrados para campanhas de reengajamento.",
    ],
  },
  {
    id: "automations",
    title: "Automações (WhatsApp)",
    icon: automationsIcon,
    plans: ["essencial", "enterprise"],
    steps: [
      "Acesse \"WhatsApp > Automações\" no menu lateral.",
      "As automações enviam mensagens automáticas pelo WhatsApp para seus clientes em momentos importantes.",
      "Existem diferentes tipos de automação disponíveis:",
      "• Lembrete de agendamento: Envia uma mensagem lembrando o cliente do horário marcado (geralmente 1 hora ou 24 horas antes).",
      "• Confirmação de agendamento: Envia uma mensagem quando o agendamento é criado.",
      "• Pós-atendimento (follow-up): Envia uma mensagem após o atendimento, pedindo avaliação ou agradecendo.",
      "Para cada automação, você pode: Ativar/Desativar usando o botão de toggle (chave liga/desliga), Personalizar a mensagem usando variáveis como {nome_cliente}, {servico}, {data}, {horario}.",
      "IMPORTANTE: Para que as automações funcionem, você precisa primeiro conectar seu WhatsApp nas Configurações > WhatsApp.",
      "Na aba \"Conversas\", você pode ver todas as conversas do chatbot com seus clientes, incluindo o que foi perguntado e respondido.",
    ],
    tips: [
      "Personalize as mensagens com o nome do seu negócio para parecer mais profissional.",
      "Lembretes reduzem em até 70% as faltas de clientes.",
      "No plano Essencial, você tem direito a 5 lembretes/dia. No Enterprise, são 20/dia.",
    ],
  },
  {
    id: "campaigns",
    title: "Campanhas (WhatsApp)",
    icon: campaignsIcon,
    plans: ["enterprise"],
    steps: [
      "Acesse \"WhatsApp > Campanhas\" no menu lateral.",
      "Campanhas permitem enviar mensagens em massa para seus clientes pelo WhatsApp.",
      "Para CRIAR uma campanha: clique em \"+ Nova Campanha\".",
      "Preencha: Nome da campanha (para sua organização), Mensagem (o texto que será enviado), Público-alvo (todos os clientes, ou filtre por critérios específicos).",
      "Você pode usar variáveis como {nome_cliente} para personalizar cada mensagem automaticamente.",
      "Após configurar, clique em \"Enviar\" ou \"Agendar\" para enviar agora ou em um horário futuro.",
      "Na lista de campanhas, você pode ver o status de cada uma: quantas mensagens foram enviadas, entregues e falharam.",
      "Limite: 3 campanhas por dia, com intervalo mínimo de 5 horas entre elas.",
    ],
    tips: [
      "Use campanhas para promoções sazonais, datas comemorativas ou para chamar clientes inativos.",
      "Evite enviar muitas campanhas seguidas para não ser bloqueado pelo WhatsApp.",
      "Personalize sempre com o nome do cliente — mensagens genéricas têm menos engajamento.",
    ],
  },
  {
    id: "communication",
    title: "Chat de Pagamento",
    icon: paymentChatIcon,
    plans: ["essencial", "enterprise"],
    steps: [
      "Acesse \"Comunicação > Chat Pagamento\" no menu lateral.",
      "Este é um canal de comunicação direto entre você e a equipe financeira/suporte sobre questões de pagamento.",
      "Para enviar uma mensagem: digite na caixa de texto na parte inferior e clique em \"Enviar\" ou pressione Enter.",
      "Você pode anexar arquivos (como comprovantes de pagamento) clicando no ícone de anexo.",
      "As mensagens aparecem em ordem cronológica — as mais recentes ficam embaixo.",
      "Um indicador mostra quando há mensagens não lidas.",
    ],
    tips: [
      "Use este chat para dúvidas sobre cobrança, faturas ou problemas de pagamento.",
      "Anexe comprovantes sempre que possível para agilizar a resolução.",
    ],
  },
  {
    id: "support-chat",
    title: "Chat de Suporte",
    icon: supportChatIcon,
    plans: ["essencial", "enterprise"],
    steps: [
      "Acesse \"Comunicação > Chat Suporte\" no menu lateral.",
      "Este é o canal para tirar dúvidas técnicas e solicitar ajuda com o sistema.",
      "Funciona da mesma forma que o Chat de Pagamento: digite sua mensagem e envie.",
      "Descreva seu problema com o máximo de detalhes para receber ajuda mais rápida.",
      "Você será notificado quando receber uma resposta da equipe de suporte.",
    ],
    tips: [
      "Antes de contatar o suporte, verifique esta página de instruções — talvez sua dúvida já esteja respondida aqui!",
      "Inclua prints de tela quando possível para facilitar o entendimento do problema.",
    ],
  },
  {
    id: "ai-assistant",
    title: "Assistente IA",
    icon: aiIcon,
    plans: ["enterprise"],
    steps: [
      "Acesse \"Comunicação > Assistente IA\" no menu lateral.",
      "O Assistente IA é um chatbot inteligente que pode ajudar com diversas tarefas do dia a dia.",
      "Você pode perguntar coisas como: \"Quais são meus agendamentos de hoje?\", \"Qual foi minha receita este mês?\" ou \"Me dê dicas para fidelizar clientes\".",
      "Digite sua pergunta na caixa de texto e pressione Enter ou clique em Enviar.",
      "O assistente usa os dados do seu negócio para dar respostas personalizadas e relevantes.",
      "As conversas ficam salvas para consulta futura.",
    ],
    tips: [
      "Experimente fazer perguntas sobre análise de desempenho — o assistente pode gerar insights valiosos.",
      "Quanto mais específica a pergunta, melhor será a resposta.",
    ],
  },
  {
    id: "upsell",
    title: "Upsell Inteligente (IA)",
    icon: aiIcon,
    plans: ["enterprise"],
    steps: [
      "O Upsell Inteligente usa Inteligência Artificial para sugerir serviços complementares automaticamente, aumentando o ticket médio do seu salão.",
      "Existem DOIS locais onde o upsell acontece: na Página Pública de agendamento (para o cliente) e nas conversas do WhatsApp (via chatbot).",
      "COMO FUNCIONA NA PÁGINA PÚBLICA: Quando o cliente seleciona um serviço (ex: Corte Feminino), o sistema exibe sugestões como \"Clientes que fazem este serviço também costumam adicionar Hidratação Profunda por R$39\".",
      "O cliente pode adicionar o serviço complementar com um clique no botão \"Adicionar\". Ele será incluído automaticamente no agendamento.",
      "COMO FUNCIONA NO WHATSAPP: Após o chatbot confirmar um agendamento, a IA sugere um serviço complementar de forma natural, como uma recepcionista faria.",
      "Exemplo: \"Você gostaria de adicionar uma escova modelada por apenas R$25? Ela complementa perfeitamente o corte.\"",
      "CONFIGURAÇÃO MANUAL: Acesse \"Upsell > Configuração\" no menu lateral para definir manualmente quais serviços devem ser sugeridos juntos.",
      "Para criar uma regra: clique em \"+ Nova Regra\". Selecione o serviço principal, o serviço recomendado, a prioridade e opcionalmente uma mensagem promocional e preço especial.",
      "Se você NÃO criar regras manuais, a IA analisa automaticamente seu catálogo de serviços e escolhe as melhores sugestões.",
      "Você pode ativar/desativar cada regra individualmente usando o toggle ao lado dela.",
      "DASHBOARD DE UPSELL: Acesse \"Upsell > Dashboard\" para ver as métricas de desempenho.",
      "O dashboard mostra: receita extra gerada por upsell, número de sugestões feitas, número de aceites, taxa de conversão e os serviços mais vendidos juntos.",
    ],
    tips: [
      "Deixe a IA trabalhar! Se você não configurar regras manuais, ela escolhe automaticamente os melhores complementos.",
      "Serviços com preço promocional têm taxa de conversão maior — experimente criar promoções especiais para upsell.",
      "Acompanhe o dashboard semanalmente para ver quais combinações de serviços funcionam melhor.",
      "O upsell funciona melhor quando suas mensagens são naturais e não parecem vendas agressivas.",
      "Limite as sugestões a no máximo 2 serviços por agendamento para não sobrecarregar o cliente.",
    ],
  },
  {
    id: "finance",
    title: "Financeiro",
    icon: financeIcon,
    plans: ["essencial", "enterprise"],
    steps: [
      "Acesse \"Financeiro\" no menu lateral para gerenciar as finanças do seu negócio.",
      "Você verá um resumo financeiro com: Receita total, Despesas totais e Lucro líquido do período selecionado.",
      "Use os filtros de data (no topo) para selecionar o período que deseja analisar (dia, semana, mês ou personalizado).",
      "Na seção de receitas, são listados todos os pagamentos recebidos, vinculados aos agendamentos concluídos.",
      "Para REGISTRAR uma despesa: clique em \"+ Nova Despesa\".",
      "Preencha: Descrição (ex: \"Aluguel do salão\"), Valor, Categoria (ex: \"Aluguel\", \"Material\", \"Pessoal\"), Data da despesa.",
      "Clique em \"Salvar\" para registrar a despesa.",
      "O gráfico mostra a evolução da receita e despesas ao longo do tempo.",
      "Pagamentos recebidos aparecem automaticamente quando agendamentos são marcados como \"Concluídos\".",
    ],
    tips: [
      "Registre todas as despesas para ter uma visão real do lucro do negócio.",
      "Use as categorias de despesa para identificar onde você mais gasta.",
      "Consulte o financeiro semanalmente para acompanhar a saúde do negócio.",
    ],
  },
  {
    id: "cash-register",
    title: "Caixa",
    icon: cashRegisterIcon,
    plans: ["essencial", "enterprise"],
    steps: [
      "Acesse \"Caixa\" no menu lateral (visível para contas do tipo Salão).",
      "O Caixa funciona como uma caixa registradora digital: você abre no início do dia e fecha no final.",
      "Para ABRIR o caixa: clique em \"Abrir Caixa\" e informe o valor inicial em dinheiro (troco).",
      "Durante o dia, registre cada movimentação: Entrada (pagamentos recebidos) ou Saída (troco dado, despesas em dinheiro).",
      "Para registrar uma movimentação: clique em \"+ Nova Movimentação\", selecione o tipo (entrada/saída), valor, forma de pagamento e descrição.",
      "No FECHAMENTO do caixa: clique em \"Fechar Caixa\". O sistema compara o valor esperado com o informado por você e mostra se há diferença.",
      "Um relatório é gerado automaticamente com o resumo do dia.",
    ],
    tips: [
      "Abra o caixa logo no início do expediente para não esquecer de registrar movimentações.",
      "Confira os valores antes de fechar — diferenças constantes podem indicar problemas.",
    ],
  },
  {
    id: "public-page",
    title: "Página Pública",
    icon: publicPageIcon,
    plans: ["essencial", "enterprise"],
    steps: [
      "Acesse \"Página Pública\" no menu lateral.",
      "A Página Pública é o seu site de agendamento online — clientes podem acessá-la para agendar horários sem precisar ligar ou mandar mensagem.",
      "Nesta tela, você pode personalizar: Cores do tema da página, Foto de capa e logo, Mensagem de boas-vindas.",
      "Para ver como sua página fica para os clientes: clique em \"Visualizar Página\" ou copie o link público e abra em outro navegador.",
      "O link da sua página é gerado automaticamente. Compartilhe com seus clientes pelo WhatsApp, Instagram ou cartão de visita.",
      "No plano Enterprise, você tem mais opções de personalização de cores e componentes.",
      "Os serviços que aparecem na página pública são os mesmos cadastrados na tela de Serviços (apenas os ativos).",
    ],
    tips: [
      "Coloque o link da sua página pública na bio do Instagram e no status do WhatsApp.",
      "Uma foto de capa bonita e profissional aumenta a confiança dos clientes.",
      "Mantenha os serviços e preços sempre atualizados na tela de Serviços.",
    ],
  },
  {
    id: "products",
    title: "Produtos (Estoque)",
    icon: productsIcon,
    plans: ["essencial", "enterprise"],
    steps: [
      "Acesse \"Produtos\" no menu lateral para gerenciar seu estoque de produtos para venda.",
      "Você verá a lista de todos os produtos cadastrados com: nome, preço de venda, preço de custo, quantidade em estoque e categoria.",
      "Para ADICIONAR um produto: clique em \"+ Novo Produto\".",
      "Preencha: Nome do produto (ex: \"Shampoo Profissional 500ml\"), Preço de venda, Preço de custo, Quantidade em estoque, Categoria (opcional) e Descrição (opcional).",
      "Clique em \"Salvar\" para cadastrar o produto.",
      "Para EDITAR um produto: clique no ícone de edição ao lado dele.",
      "Para DESATIVAR um produto: use o toggle \"Ativo\" — produtos inativos não aparecem para venda.",
      "A quantidade em estoque é atualizada manualmente — lembre-se de atualizar quando vender ou repor produtos.",
    ],
    tips: [
      "Mantenha o estoque atualizado para evitar vender algo que está em falta.",
      "Use o preço de custo para calcular sua margem de lucro real.",
      "No plano Essencial, o limite é 15 produtos. No Enterprise, ilimitado.",
    ],
  },
  {
    id: "service-packages",
    title: "Pacotes de Serviço",
    icon: productsIcon,
    plans: ["essencial", "enterprise"],
    steps: [
      "Acesse \"Pacotes\" no menu lateral.",
      "Pacotes permitem vender múltiplas sessões de um serviço com desconto (ex: 10 sessões de depilação com 20% de desconto).",
      "Para CRIAR um pacote: clique em \"+ Novo Pacote\".",
      "Preencha: Nome do pacote, Serviço vinculado, Número total de sessões, Preço original (sem desconto) e Preço do pacote (com desconto).",
      "Após criar o pacote, você pode VENDER para um cliente: clique em \"Vender Pacote\" e selecione o cliente.",
      "Para registrar o USO de uma sessão: na aba de pacotes vendidos, clique em \"Usar Sessão\" ao lado do pacote do cliente.",
      "O sistema controla automaticamente quantas sessões já foram usadas e quantas restam.",
      "Quando todas as sessões forem usadas, o status muda para \"Concluído\".",
    ],
    tips: [
      "Pacotes são ótimos para fidelizar clientes e garantir receita recorrente.",
      "Ofereça descontos atrativos (10-20%) para incentivar a compra de pacotes.",
    ],
  },
  {
    id: "coupons",
    title: "Cupons de Desconto",
    icon: couponsIcon,
    plans: ["enterprise"],
    steps: [
      "Acesse \"Cupons\" no menu lateral.",
      "Cupons permitem criar códigos de desconto para oferecer aos clientes.",
      "Para CRIAR um cupom: clique em \"+ Novo Cupom\".",
      "Preencha: Código do cupom (ex: \"PRIMEIRAVISITA\"), Tipo de desconto (porcentagem ou valor fixo), Valor do desconto (ex: 10% ou R$ 15,00).",
      "Opcionais: Quantidade máxima de usos, Valor mínimo do serviço para usar o cupom, Data de validade (início e fim).",
      "Após criar, o cupom estará ativo e poderá ser usado pelos clientes na página pública de agendamento.",
      "Para DESATIVAR um cupom: use o toggle \"Ativo\" ao lado dele.",
      "Você pode ver quantas vezes cada cupom já foi utilizado na coluna \"Usos\".",
    ],
    tips: [
      "Use cupons em datas especiais como aniversário do salão, dia das mães, etc.",
      "Cupons com limite de uso criam senso de urgência e incentivam ação rápida.",
      "Compartilhe o código do cupom nas redes sociais para atrair novos clientes.",
    ],
  },
  {
    id: "reports",
    title: "Relatórios",
    icon: reportsIcon,
    plans: ["essencial", "enterprise"],
    steps: [
      "Acesse \"Relatórios\" no menu lateral para ver análises detalhadas do seu negócio.",
      "Use os filtros de período para selecionar a faixa de datas desejada.",
      "Os relatórios incluem: Receita por período, Serviços mais procurados, Horários de pico, Taxa de ocupação.",
      "No plano Enterprise, você tem acesso a relatórios avançados com mais detalhamento e filtros por profissional.",
      "Você pode exportar os dados em formato CSV (planilha) clicando no botão \"Exportar\".",
      "Os gráficos são interativos — passe o mouse sobre eles para ver valores exatos.",
    ],
    tips: [
      "Analise os relatórios mensalmente para tomar decisões baseadas em dados.",
      "Identifique os serviços mais lucrativos e invista em promovê-los.",
      "Use o relatório de horários de pico para otimizar sua grade de atendimento.",
    ],
  },
  {
    id: "reviews",
    title: "Avaliações",
    icon: reviewsIcon,
    plans: ["enterprise"],
    steps: [
      "Acesse \"Avaliações\" no menu lateral para ver o feedback dos seus clientes.",
      "Cada avaliação mostra: nome do cliente, nota (de 1 a 5 estrelas), comentário e data.",
      "As avaliações são coletadas automaticamente após os atendimentos (quando a automação de follow-up está ativa).",
      "Você pode escolher quais avaliações ficam visíveis na sua Página Pública.",
      "A nota média geral aparece no topo da tela para referência rápida.",
    ],
    tips: [
      "Avaliações positivas na sua Página Pública aumentam a confiança de novos clientes.",
      "Responda (mesmo que internamente) a avaliações negativas para melhorar o serviço.",
    ],
  },
  {
    id: "team",
    title: "Equipe (Profissionais)",
    icon: teamIcon,
    plans: ["enterprise"],
    steps: [
      "Acesse \"Equipe\" no menu lateral (disponível apenas para contas do tipo Salão).",
      "Aqui você gerencia todos os profissionais que trabalham no seu estabelecimento.",
      "Para ADICIONAR um profissional: clique em \"+ Novo Profissional\".",
      "Preencha: Nome, E-mail, Telefone, Especialidade (opcional), Percentual de comissão.",
      "Você pode vincular SERVIÇOS específicos a cada profissional — clique em \"Serviços\" ao lado do nome para selecionar quais serviços ele atende.",
      "Para configurar HORÁRIOS INDIVIDUAIS: clique em \"Horários\" ao lado do profissional. Defina os dias e horários de trabalho ou use \"Copiar do Salão\" para replicar o horário padrão.",
      "O profissional pode ter acesso ao sistema com login próprio — ative a opção \"Permitir login\".",
      "Para recepcionistas: adicione como tipo \"Recepção\". Eles terão acesso limitado a: Agenda, Clientes, Caixa e WhatsApp.",
      "No plano Enterprise, até 5 profissionais estão inclusos. Cada adicional custa R$ 7/mês (máximo 20).",
    ],
    tips: [
      "Configure os serviços de cada profissional para evitar que clientes agendem serviços que o profissional não faz.",
      "Use a comissão para controlar automaticamente o quanto cada profissional ganha.",
      "Horários individuais são úteis quando profissionais trabalham em turnos diferentes.",
    ],
  },
  {
    id: "commission-report",
    title: "Comissões",
    icon: commissionIcon,
    plans: ["enterprise"],
    steps: [
      "Acesse \"Comissões\" no menu lateral.",
      "Esta tela mostra um relatório detalhado das comissões de cada profissional da equipe.",
      "Selecione o período desejado usando o filtro de datas no topo.",
      "Para cada profissional, você verá: Total de atendimentos, Valor total atendido, Percentual de comissão, Valor da comissão e Status (pendente ou pago).",
      "Para MARCAR como pago: selecione as comissões pendentes e clique em \"Marcar como Pago\".",
      "Você pode exportar o relatório em CSV para usar em planilhas.",
    ],
    tips: [
      "Feche as comissões semanalmente ou quinzenalmente para manter a equipe motivada.",
      "Use o relatório para identificar os profissionais mais produtivos.",
    ],
  },
  {
    id: "team-performance",
    title: "Desempenho da Equipe",
    icon: performanceIcon,
    plans: ["enterprise"],
    steps: [
      "Acesse \"Desempenho\" no menu lateral.",
      "Esta tela traz uma visão completa da performance de cada profissional.",
      "Você verá métricas como: Número de atendimentos, Receita gerada, Taxa de cancelamento/no-show, Avaliação média dos clientes.",
      "Os gráficos comparam o desempenho entre profissionais, facilitando a gestão.",
      "Use os filtros de período para comparar o desempenho em diferentes meses.",
    ],
    tips: [
      "Use esses dados em reuniões de equipe para reconhecer bons resultados.",
      "Profissionais com alta taxa de cancelamento podem precisar de treinamento em atendimento.",
    ],
  },
  {
    id: "settings",
    title: "Configurações",
    icon: settingsIcon,
    plans: ["all"],
    steps: [
      "Acesse \"Configurações\" no menu lateral para ajustar seu perfil e preferências.",
      "A tela é dividida em seções (abas):",
      "• HORÁRIOS DE FUNCIONAMENTO: Defina os dias e horários em que seu estabelecimento funciona. Ative/desative cada dia da semana e defina hora de início e fim.",
      "• ASSINATURA: Veja seu plano atual, data de renovação e gerencie sua assinatura (upgrade ou cancelamento).",
      "• WHATSAPP (Essencial e Enterprise): Conecte sua conta de WhatsApp ao sistema. Escaneie o QR Code exibido com o WhatsApp do celular para vincular.",
      "• SEGURANÇA: Altere sua senha e gerencie configurações de acesso.",
      "No plano Enterprise, seções adicionais aparecem:",
      "• SISTEMA: Personalize as cores do painel administrativo (sidebar, acentos).",
      "• PAGAMENTO: Configure suas opções de recebimento: PIX (chave e beneficiário), sinal de agendamento (cobrar antecipadamente), métodos aceitos (PIX, cartão, dinheiro).",
      "• GOOGLE CALENDAR: Conecte ao Google Agenda para sincronizar compromissos automaticamente.",
      "Após fazer alterações em qualquer seção, clique em \"Salvar\" para aplicar.",
    ],
    tips: [
      "Configure os horários corretamente — eles definem quais horários ficam disponíveis para agendamento online.",
      "Conecte o WhatsApp apenas uma vez. Se perder a conexão, volte aqui para reconectar.",
      "No Enterprise, use a personalização de cores para deixar o sistema com a identidade visual do seu negócio.",
    ],
  },
];

const Instructions = () => {
  const { currentPlan } = useFeatureAccess();
  const { data: professional } = useProfessional();
  const [search, setSearch] = useState("");
  const isSalon = professional?.account_type === "salon";

  const filteredSections = allSections.filter((section) => {
    const planMatch =
      section.plans.includes("all") ||
      section.plans.includes(currentPlan as PlanId);
    if (!planMatch) return false;

    if (
      ["team", "commission-report", "team-performance", "cash-register"].includes(section.id) &&
      !isSalon
    ) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        section.title.toLowerCase().includes(q) ||
        section.steps.some((s) => s.toLowerCase().includes(q)) ||
        (section.tips || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const planBadge = (plans: Array<PlanId | "all">) => {
    if (plans.includes("all")) return null;
    if (plans.includes("enterprise") && !plans.includes("essencial")) {
      return <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-accent/30">Enterprise</Badge>;
    }
    return null;
  };

  return (
    <DashboardLayout title="Central de Ajuda" subtitle="Aprenda a usar cada funcionalidade do sistema">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <InstructionIcon src={supportChatIcon} size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Central de Ajuda</h1>
              <p className="text-muted-foreground text-sm">
                Aprenda a usar cada funcionalidade do sistema passo a passo
              </p>
            </div>
          </div>
          {currentPlan !== "none" && (
            <Badge variant="outline" className="text-xs">
              Exibindo instruções para o plano{" "}
              <span className="font-semibold ml-1 capitalize">{currentPlan}</span>
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por funcionalidade, ação ou palavra-chave..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick navigation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Navegação Rápida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filteredSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-sm text-foreground transition-colors"
                >
                  <InstructionIcon src={section.icon} size={14} />
                  {section.title.split(" (")[0]}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        {filteredSections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma instrução encontrada para "{search}".</p>
              <p className="text-sm mt-1">Tente outra palavra-chave ou limpe a busca.</p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {filteredSections.map((section) => (
              <AccordionItem
                key={section.id}
                value={section.id}
                id={section.id}
                className="border rounded-xl bg-card px-1 data-[state=open]:shadow-sm scroll-mt-6"
              >
                <AccordionTrigger className="px-4 py-4 hover:no-underline gap-3">
                  <div className="flex items-center gap-3 text-left flex-1">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <InstructionIcon src={section.icon} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{section.title}</span>
                        {planBadge(section.plans)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {section.steps.length} passos • {section.tips?.length || 0} dicas
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-5">
                  <div className="space-y-4">
                    {/* Steps */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        📋 Passo a passo
                      </h4>
                      <ol className="space-y-2.5 ml-1">
                        {section.steps.map((step, i) => {
                          const isBullet = step.startsWith("•");
                          if (isBullet) {
                            return (
                              <li key={i} className="text-sm text-muted-foreground pl-8 flex gap-2">
                                <span className="text-primary flex-shrink-0">•</span>
                                <span>{step.substring(2)}</span>
                              </li>
                            );
                          }
                          return (
                            <li key={i} className="text-sm text-muted-foreground flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                {i + 1}
                              </span>
                              <span className="pt-0.5">{step}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>

                    {/* Tips */}
                    {section.tips && section.tips.length > 0 && (
                      <div className="mt-4 p-4 rounded-lg bg-accent/5 border border-accent/10">
                        <h4 className="text-sm font-semibold text-accent flex items-center gap-2 mb-2">
                          💡 Dicas úteis
                        </h4>
                        <ul className="space-y-1.5">
                          {section.tips.map((tip, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-accent flex-shrink-0">→</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Footer help */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <InstructionIcon src={supportChatIcon} size={20} />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Ainda tem dúvidas?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use o <strong>Chat de Suporte</strong> no menu lateral para falar diretamente com nossa equipe.
                  Estamos prontos para ajudar você!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Instructions;
