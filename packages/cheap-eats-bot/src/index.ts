import "dotenv/config";
import {
  ActionRowBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
  TextChannel,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Guild,
  type Interaction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { randomUUID } from "node:crypto";
import {
  PAYMENT_METHODS,
  RESTAURANTS,
  getPaymentMethod,
  getRestaurant,
  type CompletedOrder,
  type PaymentMethodId,
  type RestaurantCategory,
  type RestaurantId,
  type ServerConfig,
  type ServiceStatus,
  type TicketRecord,
} from "./domain.js";
import { upsertAllPanels, upsertPanel } from "./panels.js";
import { activeTicketKey, createServerConfig, JsonStore } from "./store.js";
import {
  categoryMenu,
  completionModal,
  completedOrderEmbed,
  orderModal,
  paymentMenu,
  restaurantMenu,
  statusAnnouncement,
  ticketButtons,
  ticketEmbed,
  vouchButton,
  vouchEmbed,
  vouchModal,
  supportModal,
} from "./ui.js";

const token = process.env.DISCORD_TOKEN?.trim();
if (!token) throw new Error("Set DISCORD_TOKEN in .env before starting the bot.");

const store = new JsonStore();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const pendingTicketCreations = new Set<string>();

type GuildInteraction =
  | ButtonInteraction
  | ChatInputCommandInteraction
  | ModalSubmitInteraction
  | StringSelectMenuInteraction;

function isAdministrator(interaction: GuildInteraction): boolean {
  return (
    interaction.guild?.ownerId === interaction.user.id ||
    Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))
  );
}

function hasRole(interaction: GuildInteraction, roleId: string): boolean {
  const member = interaction.member;
  if (!member || !("roles" in member)) return false;
  const roles = member.roles;
  return Array.isArray(roles) ? roles.includes(roleId) : roles.cache.has(roleId);
}

function canManageTickets(interaction: GuildInteraction, config: ServerConfig): boolean {
  return isAdministrator(interaction) || hasRole(interaction, config.roles.staff);
}

async function replyPrivate(interaction: GuildInteraction, content: string): Promise<void> {
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
}

function getGuildConfig(interaction: GuildInteraction): ServerConfig | undefined {
  return interaction.guildId ? store.getServer(interaction.guildId) : undefined;
}

function validCategory(value: string): value is RestaurantCategory {
  return RESTAURANTS.some((restaurant) => restaurant.category === value);
}

function parseUsd(value: string): string | undefined {
  const normalized = value.trim().replace(/^\$/, "").replaceAll(",", "");
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(normalized)) return undefined;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 999_999.99) return undefined;
  return `$${amount.toFixed(2)}`;
}

function safeChannelName(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "member"
  );
}

function requireTextChannel(guild: Guild, channelId: string, label: string): Promise<TextChannel> {
  return guild.channels.fetch(channelId).then((channel) => {
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error(`The configured ${label} is missing or is not a text channel.`);
    }
    return channel as TextChannel;
  });
}

async function openPrivateTicket(
  guild: Guild,
  config: ServerConfig,
  ticket: Omit<TicketRecord, "channelId">,
): Promise<TextChannel> {
  const key = activeTicketKey(guild.id, ticket.ownerId, ticket.kind);
  if (store.getState().activeTickets[key] || pendingTicketCreations.has(key)) {
    throw new Error("You already have an active ticket. Please use that one or ask staff to close it.");
  }

  pendingTicketCreations.add(key);
  let channel: TextChannel | undefined;
  try {
    const category = await guild.channels.fetch(config.channels.ticketCategory);
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new Error("The configured ticket category is missing.");
    }

    const shortId = ticket.id.slice(0, 6);
    const prefix = ticket.kind === "order" ? "order" : "support";
    const name = `${prefix}-${safeChannelName(ticket.ownerId)}-${shortId}`.slice(0, 90);
    const visibleRoles = [...new Set([config.roles.staff, config.roles.unclaim, config.roles.verifier])];
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: ticket.ownerId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      ...visibleRoles.map((roleId) => ({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      })),
      ...(client.user
        ? [
            {
              id: client.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.EmbedLinks,
              ],
            },
          ]
        : []),
    ];

    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites,
      reason: `${ticket.kind} ticket opened by ${ticket.ownerId}`,
    });

    const fullTicket: TicketRecord = { ...ticket, channelId: channel.id };
    store.getState().tickets[channel.id] = fullTicket;
    store.getState().activeTickets[key] = channel.id;
    await store.save();
    const panelMessage = await channel.send({
      embeds: [ticketEmbed(fullTicket)],
      components: ticketButtons(fullTicket),
      allowedMentions: { parse: [] },
    });
    fullTicket.panelMessageId = panelMessage.id;
    await store.save();
    return channel;
  } catch (error) {
    if (channel) {
      delete store.getState().tickets[channel.id];
      delete store.getState().activeTickets[key];
      await store.save();
      await channel.delete("Ticket setup failed; removing incomplete ticket.");
    }
    throw error;
  } finally {
    pendingTicketCreations.delete(key);
  }
}

async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await replyPrivate(interaction, "Run this command inside your server.");
    return;
  }
  if (!isAdministrator(interaction)) {
    await replyPrivate(interaction, "Only a server administrator can run /setup.");
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guild = interaction.guild;
  const previous = store.getServer(guild.id);
  const config = createServerConfig(
    guild.id,
    {
      orderPanel: interaction.options.getChannel("order_panel", true).id,
      supportPanel: interaction.options.getChannel("support_panel", true).id,
      menu: interaction.options.getChannel("menu", true).id,
      faq: interaction.options.getChannel("faq", true).id,
      status: interaction.options.getChannel("status", true).id,
      ticketCategory: interaction.options.getChannel("ticket_category", true).id,
      completed: interaction.options.getChannel("completed_orders", true).id,
      vouches: interaction.options.getChannel("vouches", true).id,
    },
    {
      staff: interaction.options.getRole("staff_role", true).id,
      unclaim: interaction.options.getRole("unclaim_role", true).id,
      verifier: interaction.options.getRole("verifier_role", true).id,
      statusPing: interaction.options.getRole("status_ping_role", true).id,
    },
    previous,
  );

  store.getState().servers[guild.id] = config;
  await store.save();
  await upsertAllPanels(guild, config, store);
  await interaction.editReply(
    "Setup is complete. Order, support, menu, FAQ, status, and vouch panels are ready.",
  );
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await replyPrivate(interaction, "Run this command inside your server.");
    return;
  }
  const config = getGuildConfig(interaction);
  if (!config) {
    await replyPrivate(interaction, "An administrator must run /setup before the bot can be used.");
    return;
  }
  if (!canManageTickets(interaction, config)) {
    await replyPrivate(interaction, "Only staff can change the service status.");
    return;
  }

  const state = interaction.options.getString("state", true) as ServiceStatus;
  const ping = interaction.options.getBoolean("ping") ?? false;
  if (ping && state !== "open") {
    await replyPrivate(interaction, "The status role can only be pinged when the status is Open.");
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  config.status = {
    state,
    reason: interaction.options.getString("reason")?.trim() ?? "",
    updatedBy: interaction.user.id,
    updatedAt: Date.now(),
  };
  await store.save();
  await upsertPanel(interaction.guild, config, "status", store);
  const statusChannel = await requireTextChannel(interaction.guild, config.channels.status, "status channel");
  await statusChannel.send(statusAnnouncement(config, ping));
  await interaction.editReply(
    ping && state === "open"
      ? "Status updated to Open and the configured status role was mentioned."
      : "Service status updated.",
  );
}

async function handleRestaurant(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await replyPrivate(interaction, "Run this command inside your server.");
    return;
  }
  const config = getGuildConfig(interaction);
  if (!config) {
    await replyPrivate(interaction, "An administrator must run /setup before the bot can be used.");
    return;
  }
  if (!canManageTickets(interaction, config)) {
    await replyPrivate(interaction, "Only staff can change restaurant availability.");
    return;
  }

  const restaurantId = interaction.options.getString("restaurant", true) as RestaurantId;
  const available = interaction.options.getBoolean("available", true);
  const restaurant = getRestaurant(restaurantId);
  if (!restaurant) {
    await replyPrivate(interaction, "That restaurant is not in this bot's menu.");
    return;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  config.restaurants[restaurantId] = available;
  await store.save();
  await upsertPanel(interaction.guild, config, "menu", store);
  await interaction.editReply(
    `${restaurant.name} is now ${available ? "available" : "unavailable"} in the order menu.`,
  );
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  switch (interaction.commandName) {
    case "setup":
      await handleSetup(interaction);
      break;
    case "status":
      await handleStatus(interaction);
      break;
    case "restaurant":
      await handleRestaurant(interaction);
      break;
  }
}

async function handleOrderButton(interaction: ButtonInteraction): Promise<void> {
  const config = getGuildConfig(interaction);
  if (!config) {
    await replyPrivate(interaction, "An administrator must run /setup before the bot can be used.");
    return;
  }
  if (config.status.state === "closed") {
    await replyPrivate(interaction, "Orders are currently closed. Please check the status channel later.");
    return;
  }

  await interaction.reply({
    content:
      config.status.state === "slow"
        ? "🟡 Service is slow right now. Choose a category to continue if you are comfortable with a longer wait."
        : "Choose a category to see the restaurants currently available.",
    components: [categoryMenu(config)],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId === "order:start") {
    await handleOrderButton(interaction);
    return;
  }
  if (interaction.customId === "support:start") {
    if (!getGuildConfig(interaction)) {
      await replyPrivate(interaction, "An administrator must run /setup before the bot can be used.");
      return;
    }
    await interaction.showModal(supportModal());
    return;
  }

  const [section, action, reference] = interaction.customId.split(":");
  if (section === "vouch" && action === "start" && reference) {
    const order = store.getState().completedOrders[reference];
    if (!order || order.guildId !== interaction.guildId) {
      await replyPrivate(interaction, "That completed order is no longer available for a vouch.");
      return;
    }
    if (interaction.user.id !== order.customerId) {
      await replyPrivate(interaction, "Only the customer for this completed order can leave its vouch.");
      return;
    }
    if (store.getState().vouches[order.id]) {
      await replyPrivate(interaction, "A vouch has already been submitted for this order.");
      return;
    }
    await interaction.showModal(
      vouchModal(order.id, interaction.channelId, interaction.message.id),
    );
    return;
  }

  if (section !== "ticket" || !action || !reference) return;
  const ticket = store.getTicket(interaction.channelId);
  const config = getGuildConfig(interaction);
  if (!ticket || ticket.channelId !== reference || !config) {
    await replyPrivate(interaction, "This ticket is closed or is no longer active.");
    return;
  }

  if (action === "claim") {
    if (!canManageTickets(interaction, config)) {
      await replyPrivate(interaction, "Only the configured staff role can claim tickets.");
      return;
    }
    if (ticket.status !== "open") {
      await replyPrivate(interaction, "This ticket has already been completed.");
      return;
    }
    if (ticket.claimedBy) {
      await replyPrivate(
        interaction,
        ticket.claimedBy === interaction.user.id
          ? "You already claimed this ticket."
          : `This ticket is already claimed by <@${ticket.claimedBy}>.`,
      );
      return;
    }
    ticket.claimedBy = interaction.user.id;
    await store.save();
    await interaction.update({
      embeds: [ticketEmbed(ticket)],
      components: ticketButtons(ticket),
      allowedMentions: { parse: [] },
    });
    return;
  }

  if (action === "unclaim") {
    if (!isAdministrator(interaction) && !hasRole(interaction, config.roles.unclaim)) {
      await replyPrivate(interaction, "Only the configured unclaim role can unclaim tickets.");
      return;
    }
    if (!ticket.claimedBy) {
      await replyPrivate(interaction, "This ticket is not currently claimed.");
      return;
    }
    if (ticket.status !== "open") {
      await replyPrivate(interaction, "Completed tickets cannot be unclaimed.");
      return;
    }
    ticket.claimedBy = undefined;
    await store.save();
    await interaction.update({
      embeds: [ticketEmbed(ticket)],
      components: ticketButtons(ticket),
      allowedMentions: { parse: [] },
    });
    return;
  }

  if (action === "complete") {
    if (!isAdministrator(interaction) && !hasRole(interaction, config.roles.verifier)) {
      await replyPrivate(interaction, "Only the configured verifier role can complete an order.");
      return;
    }
    if (ticket.kind !== "order") {
      await replyPrivate(interaction, "Only order tickets can be completed as an order.");
      return;
    }
    if (ticket.status !== "open") {
      await replyPrivate(interaction, "This order has already been completed.");
      return;
    }
    if (!ticket.claimedBy) {
      await replyPrivate(interaction, "A staff member must claim this ticket before it can be completed.");
      return;
    }
    await interaction.showModal(completionModal(ticket.channelId));
    return;
  }

  if (action === "close") {
    if (interaction.user.id !== ticket.ownerId && !canManageTickets(interaction, config)) {
      await replyPrivate(interaction, "Only the ticket owner or configured staff can close this ticket.");
      return;
    }
    await closeTicket(interaction, ticket);
  }
}

async function handleSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const config = getGuildConfig(interaction);
  if (!config) {
    await replyPrivate(interaction, "An administrator must run /setup before the bot can be used.");
    return;
  }

  const [section, step, parameter] = interaction.customId.split(":");
  const value = interaction.values[0];

  if (section === "order" && step === "category") {
    if (!validCategory(value)) {
      await replyPrivate(interaction, "That category is no longer available.");
      return;
    }
    const restaurants = RESTAURANTS.filter(
      (restaurant) => restaurant.category === value && config.restaurants[restaurant.id],
    );
    if (!restaurants.length) {
      await interaction.update({
        content: "There are no available restaurants in that category right now.",
        components: [],
      });
      return;
    }
    await interaction.update({
      content: `Choose from ${restaurants[0].categoryLabel}.`,
      components: [restaurantMenu(value, config)],
    });
    return;
  }

  if (section === "order" && step === "restaurant" && parameter) {
    if (!validCategory(parameter)) {
      await replyPrivate(interaction, "That restaurant category is not valid.");
      return;
    }
    const restaurant = getRestaurant(value);
    if (
      !restaurant ||
      restaurant.category !== parameter ||
      !config.restaurants[restaurant.id]
    ) {
      await interaction.update({
        content: "That restaurant is currently unavailable. Start again to see the current menu.",
        components: [],
      });
      return;
    }
    await interaction.update({
      content: `Choose a payment method for ${restaurant.name}.`,
      components: [paymentMenu(restaurant.id)],
    });
    return;
  }

  if (section === "order" && step === "payment" && parameter) {
    const restaurant = getRestaurant(parameter);
    const payment = getPaymentMethod(value);
    if (!restaurant || !payment || !config.restaurants[restaurant.id]) {
      await replyPrivate(interaction, "That restaurant or payment selection is no longer available.");
      return;
    }
    await interaction.showModal(orderModal(restaurant.id, payment.id));
  }
}

async function handleOrderModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild) {
    await replyPrivate(interaction, "Submit this form inside your server.");
    return;
  }
  const config = getGuildConfig(interaction);
  if (!config) {
    await replyPrivate(interaction, "An administrator must run /setup before the bot can be used.");
    return;
  }
  if (config.status.state === "closed") {
    await replyPrivate(interaction, "Orders closed before this form was submitted. Please try again later.");
    return;
  }

  const [, , restaurantValue, paymentValue] = interaction.customId.split(":");
  const restaurant = getRestaurant(restaurantValue ?? "");
  const payment = getPaymentMethod(paymentValue ?? "");
  if (!restaurant || !payment || !config.restaurants[restaurant.id]) {
    await replyPrivate(interaction, "That restaurant or payment method is no longer available.");
    return;
  }
  const cartTotal = parseUsd(interaction.fields.getTextInputValue("cart_total"));
  if (!cartTotal) {
    await replyPrivate(interaction, "Enter the cart total as a valid amount, such as 24.50.");
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const id = randomUUID();
  const ticket = {
    id,
    guildId: interaction.guild.id,
    ownerId: interaction.user.id,
    kind: "order" as const,
    status: "open" as const,
    openedAt: Date.now(),
    restaurantId: restaurant.id,
    paymentMethodId: payment.id,
    items: interaction.fields.getTextInputValue("items").trim(),
    cartTotal,
    pickupOrDelivery: interaction.fields.getTextInputValue("pickup_delivery").trim(),
    contact: interaction.fields.getTextInputValue("contact").trim(),
    notes: interaction.fields.getTextInputValue("notes").trim(),
  };
  const channel = await openPrivateTicket(interaction.guild, config, ticket);
  await interaction.editReply(`Your private order ticket is ready: ${channel}`);
}

async function handleSupportModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild) {
    await replyPrivate(interaction, "Submit this form inside your server.");
    return;
  }
  const config = getGuildConfig(interaction);
  if (!config) {
    await replyPrivate(interaction, "An administrator must run /setup before the bot can be used.");
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const channel = await openPrivateTicket(interaction.guild, config, {
    id: randomUUID(),
    guildId: interaction.guild.id,
    ownerId: interaction.user.id,
    kind: "support",
    status: "open",
    openedAt: Date.now(),
    supportDetails: interaction.fields.getTextInputValue("support_details").trim(),
  });
  await interaction.editReply(`Your private support ticket is ready: ${channel}`);
}

async function handleCompletionModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild) {
    await replyPrivate(interaction, "Submit this form inside your server.");
    return;
  }
  const channelId = interaction.customId.split(":")[2];
  const ticket = channelId ? store.getTicket(channelId) : undefined;
  const config = getGuildConfig(interaction);
  if (!ticket || !config || ticket.kind !== "order") {
    await replyPrivate(interaction, "This order ticket is no longer active.");
    return;
  }
  if (!isAdministrator(interaction) && !hasRole(interaction, config.roles.verifier)) {
    await replyPrivate(interaction, "Only the configured verifier role can complete an order.");
    return;
  }
  if (ticket.status !== "open" || !ticket.claimedBy) {
    await replyPrivate(interaction, "This ticket must be open and claimed before it can be completed.");
    return;
  }
  const finalCharge = parseUsd(interaction.fields.getTextInputValue("final_charge"));
  if (!finalCharge) {
    await replyPrivate(interaction, "Enter the final charge as a valid amount, such as 14.69.");
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const restaurantId = ticket.restaurantId;
  const paymentMethodId = ticket.paymentMethodId;
  if (!restaurantId || !paymentMethodId) {
    throw new Error("The active order ticket is missing its restaurant or payment method.");
  }
  const completedAt = Date.now();
  const order: CompletedOrder = {
    id: randomUUID(),
    guildId: interaction.guild.id,
    customerId: ticket.ownerId,
    restaurantId,
    paymentMethodId,
    finalCharge,
    openedAt: ticket.openedAt,
    completedAt,
    completedBy: interaction.user.id,
  };
  const completionChannel = await requireTextChannel(
    interaction.guild,
    config.channels.completed,
    "completed-orders channel",
  );
  const completionMessage = await completionChannel.send({
    embeds: [completedOrderEmbed(order)],
    components: [vouchButton(order)],
    allowedMentions: { parse: [] },
  });
  order.completionMessage = {
    channelId: completionChannel.id,
    messageId: completionMessage.id,
  };

  ticket.status = "completed";
  ticket.completedAt = completedAt;
  ticket.completedBy = interaction.user.id;
  ticket.finalCharge = finalCharge;
  store.getState().completedOrders[order.id] = order;
  await store.save();

  const ticketChannel = await requireTextChannel(interaction.guild, ticket.channelId, "ticket");
  await ticketChannel.send({
    content: "✅ This order was completed and verified. The customer can leave a vouch from the completed-order post.",
    allowedMentions: { parse: [] },
  });
  if (ticket.panelMessageId) {
    const ticketCard = await ticketChannel.messages.fetch(ticket.panelMessageId);
    await ticketCard.edit({
      embeds: [ticketEmbed(ticket)],
      components: ticketButtons(ticket),
      allowedMentions: { parse: [] },
    });
  }
  await interaction.editReply("The order has been verified and posted to the completed-orders channel.");
}

async function closeTicket(interaction: ButtonInteraction, ticket: TicketRecord): Promise<void> {
  if (!interaction.guild) {
    await replyPrivate(interaction, "Close this ticket from inside its server.");
    return;
  }
  const channel = await requireTextChannel(interaction.guild, ticket.channelId, "ticket");
  await interaction.deferUpdate();
  await channel.permissionOverwrites.edit(ticket.ownerId, {
    ViewChannel: false,
    SendMessages: false,
    ReadMessageHistory: false,
  });
  await channel.setName(`closed-${channel.name.replace(/^(order|support)-/, "")}`.slice(0, 90));
  await interaction.message.edit({ components: [] });
  await channel.send({
    content: `🔒 Ticket closed by <@${interaction.user.id}>.`,
    allowedMentions: { users: [interaction.user.id], parse: [] },
  });

  delete store.getState().tickets[ticket.channelId];
  delete store.getState().activeTickets[
    activeTicketKey(ticket.guildId, ticket.ownerId, ticket.kind)
  ];
  await store.save();
  await interaction.followUp({
    content: "Ticket closed. The customer's access to the private channel has been removed.",
    flags: MessageFlags.Ephemeral,
  });
}

async function handleVouchModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild) {
    await replyPrivate(interaction, "Submit this form inside your server.");
    return;
  }
  const [, , orderId, completionChannelId, messageId] = interaction.customId.split(":");
  const order = orderId ? store.getState().completedOrders[orderId] : undefined;
  const config = getGuildConfig(interaction);
  if (!order || !config || order.guildId !== interaction.guild.id || !completionChannelId || !messageId) {
    await replyPrivate(interaction, "This completed order is no longer available for a vouch.");
    return;
  }
  if (interaction.user.id !== order.customerId) {
    await replyPrivate(interaction, "Only the customer for this completed order can leave its vouch.");
    return;
  }
  if (store.getState().vouches[order.id]) {
    await replyPrivate(interaction, "A vouch has already been submitted for this order.");
    return;
  }

  const text = interaction.fields.getTextInputValue("vouch_text").trim();
  if (!text) {
    await replyPrivate(interaction, "Add a short note before submitting your vouch.");
    return;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const vouchChannel = await requireTextChannel(interaction.guild, config.channels.vouches, "vouches channel");
  const vouchMessage = await vouchChannel.send({
    embeds: [vouchEmbed(order, text)],
    allowedMentions: { users: [order.customerId], parse: [] },
  });
  store.getState().vouches[order.id] = vouchMessage.id;
  await store.save();

  const completionChannel = await requireTextChannel(
    interaction.guild,
    completionChannelId,
    "completed-orders channel",
  );
  const completionPost = await completionChannel.messages.fetch(messageId);
  await completionPost.edit({ components: [vouchButton(order, true)] });
  await interaction.editReply("Thanks — your verified vouch has been posted.");
}

async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (interaction.customId.startsWith("order:submit:")) {
    await handleOrderModal(interaction);
    return;
  }
  if (interaction.customId === "support:submit") {
    await handleSupportModal(interaction);
    return;
  }
  if (interaction.customId.startsWith("ticket:complete:")) {
    await handleCompletionModal(interaction);
    return;
  }
  if (interaction.customId.startsWith("vouch:submit:")) {
    await handleVouchModal(interaction);
  }
}

client.once("ready", (readyClient) => {
  console.info(`Cheap Eats bot is online as ${readyClient.user.tag}.`);
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) {
    return;
  }

  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    } else {
      await handleModal(interaction);
    }
  } catch (error) {
    console.error("Discord interaction failed:", error);
    try {
      await replyPrivate(
        interaction,
        "That action could not be completed. Check the bot's permissions and setup, then try again.",
      );
    } catch (replyError) {
      console.error("Could not send interaction error response:", replyError);
    }
  }
});

client.on("error", (error) => {
  console.error("Discord client error:", error);
});

await store.load();
await client.login(token);
