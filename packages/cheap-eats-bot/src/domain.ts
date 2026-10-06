export const RESTAURANTS = [
  {
    id: "wingstop",
    name: "Wingstop",
    category: "chicken",
    categoryLabel: "Chicken",
    availableByDefault: true,
  },
  {
    id: "daves-hot-chicken",
    name: "Dave's Hot Chicken",
    category: "chicken",
    categoryLabel: "Chicken",
    availableByDefault: false,
  },
  {
    id: "cinnabon",
    name: "Cinnabon",
    category: "desserts",
    categoryLabel: "Desserts & Bakery",
    availableByDefault: true,
  },
  {
    id: "chilis",
    name: "Chili's",
    category: "dining",
    categoryLabel: "Casual Dining",
    availableByDefault: true,
  },
  {
    id: "shake-shack",
    name: "Shake Shack",
    category: "burgers",
    categoryLabel: "Burgers",
    availableByDefault: true,
  },
] as const;

export type RestaurantId = (typeof RESTAURANTS)[number]["id"];
export type RestaurantCategory = (typeof RESTAURANTS)[number]["category"];

export const PAYMENT_METHODS = [
  { id: "cash-app", name: "Cash App" },
  { id: "crypto", name: "Crypto" },
  { id: "zelle", name: "Zelle" },
  { id: "venmo", name: "Venmo" },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];
export type ServiceStatus = "open" | "slow" | "closed";
export type TicketKind = "order" | "support";
export type TicketStatus = "open" | "completed";

export interface PanelRef {
  channelId: string;
  messageId: string;
}

export interface ServerConfig {
  guildId: string;
  channels: {
    orderPanel: string;
    supportPanel: string;
    menu: string;
    faq: string;
    status: string;
    ticketCategory: string;
    completed: string;
    vouches: string;
    transcripts: string;
  };
  roles: {
    staff: string;
    unclaim: string;
    verifier: string;
    statusPing: string;
    paymentRoutes: Record<PaymentMethodId, string>;
  };
  restaurants: Record<RestaurantId, boolean>;
  status: {
    state: ServiceStatus;
    reason: string;
    updatedBy: string;
    updatedAt: number;
  };
  panels: Partial<Record<"order" | "support" | "menu" | "faq" | "status" | "vouches", PanelRef>>;
}

export interface TicketRecord {
  id: string;
  guildId: string;
  channelId: string;
  panelMessageId?: string;
  ownerId: string;
  kind: TicketKind;
  status: TicketStatus;
  openedAt: number;
  claimedBy?: string;
  routeRoleId?: string;
  checklist?: {
    totalConfirmed: boolean;
    paymentConfirmed: boolean;
    orderPlaced: boolean;
  };
  restaurantId?: RestaurantId;
  paymentMethodId?: PaymentMethodId;
  items?: string;
  cartTotal?: string;
  pickupOrDelivery?: string;
  contact?: string;
  notes?: string;
  supportDetails?: string;
  finalCharge?: string;
  completedAt?: number;
  completedBy?: string;
}

export interface CompletedOrder {
  id: string;
  guildId: string;
  customerId: string;
  restaurantId: RestaurantId;
  paymentMethodId: PaymentMethodId;
  finalCharge: string;
  openedAt: number;
  completedAt: number;
  claimedBy: string;
  completedBy: string;
  completionMessage?: PanelRef;
}

export interface BotState {
  servers: Record<string, ServerConfig>;
  tickets: Record<string, TicketRecord>;
  activeTickets: Record<string, string>;
  completedOrders: Record<string, CompletedOrder>;
  vouches: Record<string, string>;
}

export function getRestaurant(id: string) {
  return RESTAURANTS.find((restaurant) => restaurant.id === id);
}

export function getPaymentMethod(id: string) {
  return PAYMENT_METHODS.find((method) => method.id === id);
}

export function statusLabel(status: ServiceStatus): string {
  return {
    open: "🟢 Open",
    slow: "🟡 Slow",
    closed: "🔴 Closed",
  }[status];
}

export function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
