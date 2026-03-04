export type AddonType = "reminders" | "campaigns" | "contacts";

export interface AddonPackage {
  id: string;
  type: AddonType;
  quantity: number;
  priceId: string;
  priceDisplay: string;
  label: string;
}

export const ADDON_PACKAGES: AddonPackage[] = [
  // Lembretes
  { id: "rem-10", type: "reminders", quantity: 10, priceId: "price_1T7H4vFjVGP9lWs0BKNJX8I3", priceDisplay: "R$ 7,00", label: "10 Lembretes" },
  { id: "rem-25", type: "reminders", quantity: 25, priceId: "price_1T7H6MFjVGP9lWs0Wcq9WHwV", priceDisplay: "R$ 17,50", label: "25 Lembretes" },
  { id: "rem-50", type: "reminders", quantity: 50, priceId: "price_1T7H8fFjVGP9lWs0zrDZP5GZ", priceDisplay: "R$ 35,00", label: "50 Lembretes" },
  // Campanhas
  { id: "camp-5", type: "campaigns", quantity: 5, priceId: "price_1T7HWPFjVGP9lWs0NdSjwuwO", priceDisplay: "R$ 15,00", label: "5 Campanhas" },
  { id: "camp-15", type: "campaigns", quantity: 15, priceId: "price_1T7HWjFjVGP9lWs03IzoPU8w", priceDisplay: "R$ 30,00", label: "15 Campanhas" },
  { id: "camp-30", type: "campaigns", quantity: 30, priceId: "price_1T7HXIFjVGP9lWs023qLe4y1", priceDisplay: "R$ 50,00", label: "30 Campanhas" },
  // Contatos
  { id: "cont-20", type: "contacts", quantity: 20, priceId: "price_1T7HXcFjVGP9lWs0pUGKjxSb", priceDisplay: "R$ 14,00", label: "20 Contatos" },
  { id: "cont-50", type: "contacts", quantity: 50, priceId: "price_1T7HXpFjVGP9lWs0FBVYdSZa", priceDisplay: "R$ 30,00", label: "50 Contatos" },
  { id: "cont-100", type: "contacts", quantity: 100, priceId: "price_1T7HYzFjVGP9lWs0K0QZWPzr", priceDisplay: "R$ 50,00", label: "100 Contatos" },
];

export const ADDON_TYPE_LABELS: Record<AddonType, string> = {
  reminders: "Lembretes",
  campaigns: "Campanhas",
  contacts: "Contatos por Campanha",
};

export const ADDON_TYPE_ICONS: Record<AddonType, string> = {
  reminders: "clock",
  campaigns: "megaphone",
  contacts: "users",
};

export const getPackagesByType = (type: AddonType) =>
  ADDON_PACKAGES.filter((p) => p.type === type);
