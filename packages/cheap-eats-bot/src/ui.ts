import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  PAYMENT_METHODS,
  RESTAURANTS,
  formatDuration,
  getPaymentMethod,
  getRestaurant,
  statusLabel,
  type CompletedOrder,
  type RestaurantCategory,
  type RestaurantId,
  type ServerConfig,
  type TicketRecord,
} from "./domain.js";

const cyan = 0x25c6d5;
const green = 0x2ecc71;

export function orderPanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(cyan)
        .setTitle("🍽️ Cheap Eats — Ordering")
        .setDescription(
          [
            "Start here when you are ready to order.",
            "Choose a category, restaurant, and payment method, then complete the private order form.",
            "",
            "**Accepted payment methods**",
            "Cash App · Crypto · Zelle · Venmo",
            "",
            "Staff review the order in a private ticket before it is completed.",
          ].join("\n"),
        ),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("order:start")
          .setLabel("Start an order")
          .setEmoji("🛒")
          .setStyle(ButtonStyle.Primary),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

export function supportPanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(cyan)
        .setTitle("🛟 Support")
        .setDescription(
          "Open a private support ticket for order questions, payment help, or other service issues. Do not post payment credentials or card details.",
        ),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("support:start")
          .setLabel("General Support")
          .setEmoji("🛠️")
          .setStyle(ButtonStyle.Primary),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

export function menuPanel(config: ServerConfig) {
  const list = RESTAURANTS.map((restaurant) => {
    const available = config.restaurants[restaurant.id];
    return `${available ? "•" : "~~•"} ${restaurant.name}${available ? "" : " — unavailable"}`;
  });
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(cyan)
        .setTitle("📋 Cheap Eats — Menu")
        .setDescription(
          [
            "Choose from the current restaurant list in the order channel.",
            "",
            ...list,
            "",
            "Dave's Hot Chicken is sometimes available. Staff can toggle it on when offered.",
          ].join("\n"),
        )
        .setFooter({ text: "Availability can change based on service status and staff." }),
    ],
    allowedMentions: { parse: [] },
  };
}

export function faqPanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(cyan)
        .setTitle("❓ Frequently Asked Questions")
        .setDescription(
          [
            "**How do I order?**",
            "Open the order panel, choose a category and available restaurant, select your payment method, then submit the private form.",
            "",
            "**Which payment methods are accepted?**",
            "Cash App, Crypto, Zelle, and Venmo.",
            "",
            "**Which payments are not accepted?**",
            "Apple Pay, PayPal, and Chime are not accepted.",
            "",
            "**How long will an order take?**",
            "Timing depends on the current service status, restaurant, and delivery or pickup details. Check the status channel before ordering.",
            "",
            "**What information should I include?**",
            "List items and quantities, cart total, pickup or delivery details, and any useful notes in the private form.",
          ].join("\n"),
        ),
    ],
    allowedMentions: { parse: [] },
  };
}

export function statusPanel(config: ServerConfig) {
  const state = config.status.state;
  const color = state === "open" ? green : state === "slow" ? 0xf1c40f : 0xe74c3c;
  const message =
    state === "open"
      ? "Accepting orders."
      : state === "slow"
        ? "Accepting orders, but service may take longer than usual."
        : "Orders are currently closed.";
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(color)
        .setTitle(`${statusLabel(state)} — Cheap Eats`)
        .setDescription(
          [
            message,
            config.status.reason ? `\n**Update:** ${config.status.reason}` : "",
            "\nUse the order channel to start an order when service is accepting them.",
          ].join(""),
        )
        .setFooter({
          text: config.status.updatedAt
            ? `Last updated ${new Date(config.status.updatedAt).toLocaleString("en-US")}`
            : "Status not updated yet",
        }),
    ],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("order:start")
          .setLabel("Open order")
          .setEmoji("🛒")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(state === "closed"),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

export function vouchesPanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(cyan)
        .setTitle("⭐ Customer Vouches")
        .setDescription("Verified customers can leave one vouch from their completed-order post."),
    ],
    allowedMentions: { parse: [] },
  };
}

export function categoryMenu(config: ServerConfig) {
  const categories = [
    ...new Map(
      RESTAURANTS.filter((restaurant) => config.restaurants[restaurant.id]).map((restaurant) => [
        restaurant.category,
        restaurant,
      ]),
    ).entries(),
  ];
  const options = categories.map(([category, restaurant]) => {
    const count = RESTAURANTS.filter(
      (item) => item.category === category && config.restaurants[item.id],
    ).length;
    return new StringSelectMenuOptionBuilder()
      .setLabel(restaurant.categoryLabel)
      .setValue(category)
      .setDescription(`${count} available ${count === 1 ? "place" : "places"}`);
  });
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("order:category")
      .setPlaceholder("Choose a category")
      .addOptions(options),
  );
}

export function restaurantMenu(category: RestaurantCategory, config: ServerConfig) {
  const restaurants = RESTAURANTS.filter(
    (restaurant) => restaurant.category === category && config.restaurants[restaurant.id],
  );
  const options = restaurants.map((restaurant) =>
    new StringSelectMenuOptionBuilder().setLabel(restaurant.name).setValue(restaurant.id),
  );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`order:restaurant:${category}`)
      .setPlaceholder("Choose a restaurant")
      .addOptions(options),
  );
}

export function paymentMenu(restaurantId: RestaurantId) {
  const options = PAYMENT_METHODS.map((method) =>
    new StringSelectMenuOptionBuilder().setLabel(method.name).setValue(method.id),
  );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`order:payment:${restaurantId}`)
      .setPlaceholder("Choose a payment method")
      .addOptions(options),
  );
}

function modalField(
  customId: string,
  label: string,
  style = TextInputStyle.Short,
  required = true,
  placeholder?: string,
) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required)
    .setMaxLength(1000);
  if (placeholder) input.setPlaceholder(placeholder);
  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}

export function orderModal(restaurantId: RestaurantId, paymentId: string) {
  const restaurant = getRestaurant(restaurantId);
  const payment = getPaymentMethod(paymentId);
  if (!restaurant || !payment) throw new Error("Invalid restaurant or payment selection.");
  return new ModalBuilder()
    .setCustomId(`order:submit:${restaurantId}:${paymentId}`)
    .setTitle(`${restaurant.name} order details`)
    .addComponents(
      modalField("items", "Items and quantities", TextInputStyle.Paragraph, true),
      modalField("cart_total", "Cart total (example: 24.50)", TextInputStyle.Short, true, "$0.00"),
      modalField(
        "pickup_delivery",
        "Pickup or delivery details",
        TextInputStyle.Paragraph,
        true,
      ),
      modalField("contact", "Contact details (optional)", TextInputStyle.Short, false),
      modalField("notes", "Extra notes (optional)", TextInputStyle.Paragraph, false),
    );
}

export function supportModal() {
  return new ModalBuilder()
    .setCustomId("support:submit")
    .setTitle("General support")
    .addComponents(
      modalField("support_details", "What do you need help with?", TextInputStyle.Paragraph, true),
    );
}

export function completionModal(channelId: string) {
  return new ModalBuilder()
    .setCustomId(`ticket:complete:${channelId}`)
    .setTitle("Verify completed order")
    .addComponents(
      modalField("final_charge", "Final charge (example: 14.69)", TextInputStyle.Short, true, "$0.00"),
    );
}

export function ticketEmbed(ticket: TicketRecord) {
  const embed = new EmbedBuilder()
    .setColor(ticket.status === "completed" ? green : cyan)
    .setTitle(ticket.kind === "order" ? "🛒 Cheap Eats Order" : "🛟 General Support")
    .setDescription(
      ticket.kind === "order"
        ? "Private food order ticket. A staff member should claim it before handling."
        : "Private support ticket. Only you and the configured staff roles can see this channel.",
    )
    .addFields(
      { name: "👤 Customer", value: `<@${ticket.ownerId}>`, inline: true },
      {
        name: "📌 Claim",
        value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Unclaimed",
        inline: true,
      },
    );

  if (ticket.kind === "order") {
    embed
      .addFields(
        { name: "🍽️ Restaurant", value: getRestaurant(ticket.restaurantId ?? "")?.name ?? "—", inline: true },
        { name: "💳 Payment", value: getPaymentMethod(ticket.paymentMethodId ?? "")?.name ?? "—", inline: true },
        { name: "🧾 Items and quantities", value: ticket.items || "—" },
        { name: "🛒 Cart total", value: ticket.cartTotal || "—", inline: true },
        { name: "📍 Pickup or delivery", value: ticket.pickupOrDelivery || "—" },
        { name: "☎️ Contact", value: ticket.contact || "Not provided", inline: true },
        { name: "📝 Notes", value: ticket.notes || "Not provided", inline: true },
      )
      .setFooter({ text: "Customer order details are visible only inside this private ticket." });
    if (ticket.status === "completed") {
      embed.addFields(
        { name: "✅ Final charge", value: ticket.finalCharge || "—", inline: true },
        {
          name: "Verified by",
          value: ticket.completedBy ? `<@${ticket.completedBy}>` : "—",
          inline: true,
        },
      );
    }
  } else {
    embed.addFields({ name: "📝 Support request", value: ticket.supportDetails || "—" });
  }

  return embed;
}

export function ticketButtons(ticket: TicketRecord) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:claim:${ticket.channelId}`)
      .setLabel(ticket.claimedBy ? "Claimed" : ticket.kind === "order" ? "Claim Order" : "Claim Ticket")
      .setEmoji(ticket.claimedBy ? "👨‍🍳" : "🙋")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(Boolean(ticket.claimedBy) || ticket.status === "completed"),
    new ButtonBuilder()
      .setCustomId(`ticket:unclaim:${ticket.channelId}`)
      .setLabel("Unclaim")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!ticket.claimedBy || ticket.status === "completed"),
    new ButtonBuilder()
      .setCustomId(`ticket:complete:${ticket.channelId}`)
      .setLabel("Complete order")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success)
      .setDisabled(ticket.kind !== "order" || !ticket.claimedBy || ticket.status === "completed"),
    new ButtonBuilder()
      .setCustomId(`ticket:close:${ticket.channelId}`)
      .setLabel("Close ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger),
  );
  return [row];
}

export function completedOrderEmbed(order: CompletedOrder) {
  const restaurant = getRestaurant(order.restaurantId)?.name ?? "Restaurant";
  const payment = getPaymentMethod(order.paymentMethodId)?.name ?? "Payment";
  return new EmbedBuilder()
    .setColor(green)
    .setTitle("✅ Cheap Eats — Order Completed")
    .setDescription(`**${restaurant}** is complete.`)
    .addFields(
      { name: "🍽️ Restaurant", value: restaurant, inline: true },
      { name: "💳 Payment", value: payment, inline: true },
      { name: "🏷️ Final charge", value: order.finalCharge, inline: true },
      { name: "👤 Customer", value: `<@${order.customerId}>`, inline: true },
      { name: "✅ Completed by", value: `<@${order.completedBy}>`, inline: true },
      {
        name: "⏱️ Completed in",
        value: formatDuration(order.completedAt - order.openedAt),
        inline: true,
      },
    )
    .setFooter({ text: "Completed by an authorized order verifier." });
}

export function vouchButton(order: CompletedOrder, disabled = false) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`vouch:start:${order.id}`)
      .setLabel(disabled ? "Vouch submitted" : "Leave a vouch")
      .setEmoji("⭐")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}

export function vouchEmbed(order: CompletedOrder, text: string) {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("⭐ Verified Customer Vouch")
    .setDescription(text)
    .addFields(
      { name: "Customer", value: `<@${order.customerId}>`, inline: true },
      { name: "Restaurant", value: getRestaurant(order.restaurantId)?.name ?? "—", inline: true },
    )
    .setFooter({ text: `Verified completed order · ${new Date(order.completedAt).toLocaleDateString("en-US")}` });
}

export function vouchModal(orderId: string, completionChannelId: string, messageId: string) {
  return new ModalBuilder()
    .setCustomId(`vouch:submit:${orderId}:${completionChannelId}:${messageId}`)
    .setTitle("Leave a customer vouch")
    .addComponents(
      modalField(
        "vouch_text",
        "Share a short review of your completed order",
        TextInputStyle.Paragraph,
        true,
      ),
    );
}

export function statusAnnouncement(config: ServerConfig, ping: boolean) {
  const text =
    config.status.state === "open"
      ? "Orders are now open."
      : config.status.state === "slow"
        ? "Orders are open, but service is currently slow."
        : "Orders are now closed.";
  const mention = ping && config.status.state === "open" ? `<@&${config.roles.statusPing}> ` : "";
  return {
    content: `${mention}${statusLabel(config.status.state)} — ${text}`,
    embeds: [
      new EmbedBuilder()
        .setColor(
          config.status.state === "open"
            ? green
            : config.status.state === "slow"
              ? 0xf1c40f
              : 0xe74c3c,
        )
        .setDescription(config.status.reason || text),
    ],
    allowedMentions: {
      parse: [],
      roles: ping && config.status.state === "open" ? [config.roles.statusPing] : [],
    },
  };
}
