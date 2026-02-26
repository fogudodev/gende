// Stripe plan configuration - centralized
export const STRIPE_PLANS = {
  free: {
    name: "Free",
    price: "R$ 0",
    priceId: null,
    productId: null,
    features: [
      "50 agendamentos/mês",
      "5 serviços",
      "30 clientes",
      "Página pública básica",
    ],
    limits: {
      maxBookingsPerMonth: 50,
      maxServices: 5,
      maxClients: 30,
    },
  },
  starter: {
    name: "Starter",
    price: "R$ 49,90",
    priceId: "price_1T57OUFjVGP9lWs08ZViwOdY",
    productId: "prod_U3DqJqyo9urw60",
    features: [
      "100 agendamentos/mês",
      "10 serviços",
      "100 clientes",
      "Página pública personalizada",
      "Relatórios básicos",
    ],
    limits: {
      maxBookingsPerMonth: 100,
      maxServices: 10,
      maxClients: 100,
    },
  },
  pro: {
    name: "Pro",
    price: "R$ 99,90",
    priceId: "price_1T57PnFjVGP9lWs0YWLEVvBZ",
    productId: "prod_U3DrWGOLjl8pSx",
    features: [
      "Agendamentos ilimitados",
      "Serviços ilimitados",
      "Clientes ilimitados",
      "Automação WhatsApp",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    limits: {
      maxBookingsPerMonth: -1,
      maxServices: -1,
      maxClients: -1,
    },
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;
