import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { CHANNEL_SETTINGS, ROLE_SETTINGS } from "./settings.js";

const adminOnly = PermissionFlagsBits.Administrator;

export const slashCommands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Connect this server's channels and staff roles to the bot.")
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
    .addChannelOption((option) =>
      option
        .setName("transcripts")
        .setDescription("Private staff channel where closed-ticket transcripts are archived.")
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
        .setDescription("Role members opt into for order status notifications.")
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option
        .setName("route_cash_app")
        .setDescription("Staff role notified and granted access for Cash App orders.")
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option
        .setName("route_crypto")
        .setDescription("Staff role notified and granted access for Crypto orders.")
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option
        .setName("route_zelle")
        .setDescription("Staff role notified and granted access for Zelle orders.")
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option
        .setName("route_venmo")
        .setDescription("Staff role notified and granted access for Venmo orders.")
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
        .setAutocomplete(true)
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("available")
        .setDescription("Whether customers can select this restaurant.")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("menu")
    .setDescription("Post or refresh the full restaurant menu."),
  ...CHANNEL_SETTINGS.map((setting) =>
    new SlashCommandBuilder()
      .setName(setting.name)
      .setDescription(setting.description)
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel to use for this setting.")
          .addChannelTypes(
            setting.channelType === "category"
              ? ChannelType.GuildCategory
              : ChannelType.GuildText,
          )
          .setRequired(true),
      ),
  ),
  ...ROLE_SETTINGS.map((setting) =>
    new SlashCommandBuilder()
      .setName(setting.name)
      .setDescription(setting.description)
      .addRoleOption((option) =>
        option.setName("role").setDescription("Role to use for this setting.").setRequired(true),
      ),
  ),
  new SlashCommandBuilder()
    .setName("access")
    .setDescription("Manage who can use Cheap Eats management commands.")
    .setDefaultMemberPermissions(adminOnly)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("grant")
        .setDescription("Allow a user to run bot management commands.")
        .addUserOption((option) =>
          option.setName("user").setDescription("User to approve.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("revoke")
        .setDescription("Remove a user's bot management access.")
        .addUserOption((option) =>
          option.setName("user").setDescription("User to remove.").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List users approved for bot management."),
    ),
].map((command) => command.toJSON());
