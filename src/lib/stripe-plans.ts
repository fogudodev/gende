// Stripe plan configuration - centralized
export const STRIPE_PLANS = {
  essencial: {
    name: "Essencial",
    price: "R$ 49,90",
    priceMonthly: "R$ 49,90",
    priceAnnual: "R$ 499,90",
    priceId: "price_1T57OUFjVGP9lWs08ZViwOdY",
    priceIdAnnual: "price_1T5DskFjVGP9lWs0IjaVXqPL",
    productId: "prod_U3DqJqyo9urw60",
    productIdAnnual: "prod_U3KXrtuJF9WAOC",
    features: [
      "100 agendamentos/mês",
      "10 serviços",
      "100 clientes",
      "5 lembretes/dia",
      "15 produtos em estoque",
      "Página pública padrão",
      "Relatórios básicos",
    ],
    limits: {
      maxBookingsPerMonth: 100,
      maxServices: 10,
      maxClients: 100,
      maxProducts: 15,
      dailyReminders: 5,
      dailyCampaigns: 0,
    },
  },
  enterprise: {
    name: "Enterprise",
    price: "R$ 99,90",
    priceMonthly: "R$ 99,90",
    priceAnnual: "R$ 999,00",
    priceId: "price_1T57PnFjVGP9lWs0YWLEVvBZ",
    priceIdAnnual: "price_1T5Du2FjVGP9lWs0iO6PN4eF",
    productId: "prod_U3DrWGOLjl8pSx",
    productIdAnnual: "prod_U3KZFQMZF4cxPs",
    features: [
      "Agendamentos ilimitados",
      "Serviços ilimitados",
      "Clientes ilimitados",
      "Produtos ilimitados",
      "Automação WhatsApp completa",
      "Campanhas ilimitadas",
      "Relatórios avançados",
      "Página pública personalizada",
      "Cobrar sinal de agendamento",
      "Até 5 profissionais inclusos",
      "Adicional R$ 7/profissional (máx 20)",
      "Integração Google Calendar (Salão)",
      "Suporte prioritário",
    ],
    limits: {
      maxBookingsPerMonth: -1,
      maxServices: -1,
      maxClients: -1,
      maxProducts: -1,
      dailyReminders: -1,
      dailyCampaigns: -1,
      maxEmployees: 5,
      maxEmployeesHardLimit: 20,
      additionalEmployeePrice: 7,
      additionalEmployeePriceId: "price_1T5EBbFjVGP9lWs0mTpdPlol",
      additionalEmployeeProductId: "prod_U3KrydRhlXjRr4",
    },
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

// All product IDs that map to each plan (monthly + annual)
export const PRODUCT_TO_PLAN: Record<string, PlanId> = {
  "prod_U3DqJqyo9urw60": "essencial",
  "prod_U3KXrtuJF9WAOC": "essencial",
  "prod_U3DrWGOLjl8pSx": "enterprise",
  "prod_U3KZFQMZF4cxPs": "enterprise",
};

// Feature access rules per plan
export type FeatureKey =
  | "dashboard"
  | "bookings"
  | "services"
  | "clients"
  | "automations"
  | "campaigns"
  | "finance"
  | "public-page"
  | "products"
  | "coupons"
  | "reports"
  | "reviews"
  | "settings"
  | "team"
  | "payment-settings"
  | "commission-report"
  | "team-performance"
  | "google-calendar";

export const PLAN_FEATURES: Record<PlanId | "none", FeatureKey[]> = {
  none: [
    "dashboard",
    "bookings",
    "services",
    "clients",
    "reviews",
    "settings",
  ],
  essencial: [
    "dashboard",
    "bookings",
    "services",
    "clients",
    "automations", // only reminders, no campaigns
    "finance",
    "public-page",
    "products",
    "coupons",
    "reports",
    "reviews",
    "settings",
  ],
  enterprise: [
    "dashboard",
    "bookings",
    "services",
    "clients",
    "automations",
    "campaigns",
    "finance",
    "public-page",
    "products",
    "coupons",
    "reports",
    "reviews",
    "settings",
    "team",
    "payment-settings",
    "commission-report",
    "team-performance",
    "google-calendar",
  ],
};
