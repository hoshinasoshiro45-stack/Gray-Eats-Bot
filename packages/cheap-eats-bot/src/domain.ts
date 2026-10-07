interface RestaurantDefinition {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  availableByDefault: boolean;
  specialNote?: string;
  pickupOnly?: boolean;
}

const restaurantDefinitions = [
  { id: "dominos", name: "Domino's", category: "pizza", categoryLabel: "Pizza", availableByDefault: true },
  { id: "papa-johns", name: "Papa John's", category: "pizza", categoryLabel: "Pizza", availableByDefault: true },
  { id: "churchs-chicken", name: "Church's Chicken", category: "chicken", categoryLabel: "Chicken", availableByDefault: true },
  { id: "jersey-mikes-subs", name: "Jersey Mike's Subs", category: "sandwiches", categoryLabel: "Sandwiches", availableByDefault: true },
  { id: "panda-express", name: "Panda Express", category: "asian", categoryLabel: "Asian", availableByDefault: true },
  { id: "auntie-annes", name: "Auntie Anne's", category: "bakery", categoryLabel: "Bakery & Desserts", availableByDefault: true },
  { id: "panera-bread", name: "Panera Bread", category: "sandwiches", categoryLabel: "Sandwiches", availableByDefault: true },
  { id: "ihop", name: "IHOP", category: "casual-dining", categoryLabel: "Casual Dining", availableByDefault: false, specialNote: "not for everyone" },
  { id: "smoothie-king", name: "Smoothie King", category: "smoothies", categoryLabel: "Smoothies & Bowls", availableByDefault: false, specialNote: "sometimes" },
  { id: "applebees", name: "Applebee's", category: "casual-dining", categoryLabel: "Casual Dining", availableByDefault: true },
  { id: "tropical-smoothie-cafe", name: "Tropical Smoothie Cafe", category: "smoothies", categoryLabel: "Smoothies & Bowls", availableByDefault: true },
  { id: "sonic", name: "Sonic", category: "burgers", categoryLabel: "Burgers", availableByDefault: true },
  { id: "buffalo-wild-wings", name: "Buffalo Wild Wings", category: "chicken", categoryLabel: "Chicken", availableByDefault: true },
  { id: "marcos-pizza", name: "Marco's Pizza", category: "pizza", categoryLabel: "Pizza", availableByDefault: true },
  { id: "jim-n-nicks", name: "Jim N Nick's Bar-B-Q", category: "casual-dining", categoryLabel: "Casual Dining", availableByDefault: true },
  { id: "cava", name: "CAVA", category: "mediterranean", categoryLabel: "Mediterranean", availableByDefault: true },
  { id: "fluffies-hot-chicken", name: "Fluffies Hot Chicken", category: "chicken", categoryLabel: "Chicken", availableByDefault: true },
  { id: "steak-n-shake", name: "Steak 'n Shake", category: "burgers", categoryLabel: "Burgers", availableByDefault: true },
  { id: "taco-cabana", name: "Taco Cabana", category: "tex-mex", categoryLabel: "Tex-Mex", availableByDefault: true },
  { id: "raising-canes", name: "Raising Cane's Chicken Fingers", category: "chicken", categoryLabel: "Chicken", availableByDefault: true, specialNote: "pickup only", pickupOnly: true },
  { id: "mcalisters-deli", name: "McAlister's Deli", category: "sandwiches", categoryLabel: "Sandwiches", availableByDefault: true },
  { id: "carls-jr", name: "Carl's Jr.", category: "burgers", categoryLabel: "Burgers", availableByDefault: true },
  { id: "whataburger", name: "Whataburger", category: "burgers", categoryLabel: "Burgers", availableByDefault: true },
  { id: "zaxbys", name: "Zaxby's", category: "chicken", categoryLabel: "Chicken", availableByDefault: true },
  { id: "red-lobster", name: "Red Lobster", category: "casual-dining", categoryLabel: "Casual Dining", availableByDefault: true },
  { id: "pf-changs", name: "P.F. Chang's", category: "asian", categoryLabel: "Asian", availableByDefault: true },
  { id: "jamba", name: "Jamba", category: "smoothies", categoryLabel: "Smoothies & Bowls", availableByDefault: true },
  { id: "playa-bowls", name: "Playa Bowls", category: "smoothies", categoryLabel: "Smoothies & Bowls", availableByDefault: true },
  { id: "five-guys", name: "Five Guys", category: "burgers", categoryLabel: "Burgers", availableByDefault: true },
  { id: "habit-burger", name: "The Habit Burger Grill", category: "burgers", categoryLabel: "Burgers", availableByDefault: true },
  { id: "smashburger", name: "Smashburger", category: "burgers", categoryLabel: "Burgers", availableByDefault: true },
  { id: "insomnia-cookies", name: "Insomnia Cookies", category: "bakery", categoryLabel: "Bakery & Desserts", availableByDefault: true },
] as const satisfies readonly RestaurantDefinition[];

type RestaurantEntry = (typeof restaurantDefinitions)[number] & RestaurantDefinition;
export const RESTAURANTS: readonly RestaurantEntry[] = restaurantDefinitions;

export type RestaurantId = (typeof restaurantDefinitions)[number]["id"];
export type RestaurantCategory = (typeof restaurantDefinitions)[number]["category"];

const historicalRestaurantNames: Record<string, string> = {
  wingstop: "Wingstop",
  cinnabon: "Cinnabon",
  chilis: "Chili's",
  "daves-hot-chicken": "Dave's Hot Chicken",
  "shake-shack": "Shake Shack",
};

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
  ticketChannelId?: string;
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
  managementAccessUsers: Record<string, string[]>;
  tickets: Record<string, TicketRecord>;
  activeTickets: Record<string, string>;
  completedOrders: Record<string, CompletedOrder>;
  vouches: Record<string, string>;
}

export function getRestaurant(id: string) {
  return RESTAURANTS.find((restaurant) => restaurant.id === id);
}

export function getRestaurantDisplayName(id: string): string | undefined {
  return getRestaurant(id)?.name ?? historicalRestaurantNames[id];
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
