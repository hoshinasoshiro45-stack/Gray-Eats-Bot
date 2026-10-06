import "dotenv/config";
import { REST, Routes } from "discord.js";
import { slashCommands } from "./commands.js";

const token = process.env.DISCORD_TOKEN?.trim();
const clientId = process.env.DISCORD_CLIENT_ID?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();

if (!token || !clientId || !guildId) {
  throw new Error("Set DISCORD_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID in .env first.");
}

const rest = new REST({ version: "10" }).setToken(token);
await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: slashCommands });
console.info(`Registered ${slashCommands.length} Cheap Eats bot commands in guild ${guildId}.`);
