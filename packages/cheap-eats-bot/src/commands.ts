import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { RESTAURANTS } from "./domain.js";

const adminOnly = PermissionFlagsBits.Administrator;

export const slashCommands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Connect this server's channels and staff roles to the bot.")
    .setDefaultMemberPermissions(adminOnly)
    .addChannelOption((option) =>
      option
        .setName("order_panel")
        .setDescription("Text channel where members start an order.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("support_panel")
        .setDescription("Text channel where members open support tickets.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("menu")
        .setDescription("Text channel listing currently available restaurants.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("faq")
        .setDescription("Text channel for payment and ordering answers.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("status")
        .setDescription("Text channel for open, slow, and closed updates.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("ticket_category")
        .setDescription("Category where private order and support tickets are created.")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("completed_orders")
        .setDescription("Text channel for verified completed-order posts.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("vouches")
        .setDescription("Text channel where customer vouches are posted.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option
        .setName("staff_role")
        .setDescription("Staff who can claim and close tickets.")
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option
        .setName("unclaim_role")
        .setDescription("Only this role and server admins can unclaim tickets.")
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option
        .setName("verifier_role")
        .setDescription("Only this role and server admins can complete orders.")
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option
        .setName("status_ping_role")
        .setDescription("Role to mention when staff announce that orders are open.")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Set the food service status for the server.")
    .addStringOption((option) =>
      option
        .setName("state")
        .setDescription("Whether orders are open, slow, or closed.")
        .addChoices(
          { name: "Open", value: "open" },
          { name: "Slow", value: "slow" },
          { name: "Closed", value: "closed" },
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Optional short update shown to the server.")
        .setMaxLength(250)
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("ping")
        .setDescription("Mention the configured status role when changing to Open.")
        .setRequired(false),
    ),
  new SlashCommandBuilder()
    .setName("restaurant")
    .setDescription("Change whether a restaurant appears in the order menu.")
    .addStringOption((option) =>
      option
        .setName("restaurant")
        .setDescription("Restaurant to make available or unavailable.")
        .addChoices(...RESTAURANTS.map(({ id, name }) => ({ name, value: id })))
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("available")
        .setDescription("Whether customers can select this restaurant.")
        .setRequired(true),
    ),
].map((command) => command.toJSON());
