import { ChannelType, type Guild, type Message, type TextChannel } from "discord.js";
import type { ServerConfig } from "./domain.js";
import { JsonStore } from "./store.js";
import {
  faqPanel,
  menuPanel,
  orderPanel,
  statusPanel,
  supportPanel,
  vouchesPanel,
} from "./ui.js";

const panelChannels = {
  order: "orderPanel",
  support: "supportPanel",
  menu: "menu",
  faq: "faq",
  status: "status",
  vouches: "vouches",
} as const;

export type PanelKey = keyof typeof panelChannels;

interface UpsertPanelOptions {
  payload?: ReturnType<typeof getPanelPayload>;
  replaceExisting?: boolean;
}

function getPanelPayload(key: keyof typeof panelChannels, config: ServerConfig) {
  switch (key) {
    case "order":
      return orderPanel();
    case "support":
      return supportPanel();
    case "menu":
      return menuPanel(config);
    case "faq":
      return faqPanel();
    case "status":
      return statusPanel(config);
    case "vouches":
      return vouchesPanel();
  }
}

export async function upsertPanel(
  guild: Guild,
  config: ServerConfig,
  key: PanelKey,
  store: JsonStore,
  options: UpsertPanelOptions = {},
): Promise<Message> {
  const channelId = config.channels[panelChannels[key]];
  const channel = await guild.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error(`Configured ${key} channel is missing or is not a text channel.`);
  }

  const payload = options.payload ?? getPanelPayload(key, config);
  const previous = config.panels[key];
  let previousMessage: Message | undefined;
  if (previous?.channelId === channel.id) {
    try {
      const existing = await (channel as TextChannel).messages.fetch(previous.messageId);
      if (options.replaceExisting) {
        previousMessage = existing;
      } else {
        const updated = await existing.edit(payload);
        config.panels[key] = { channelId: channel.id, messageId: updated.id };
        await store.save();
        return updated;
      }
    } catch (error) {
      const isMissingMessage =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 10008;
      if (!isMissingMessage) throw error;
    }
  }

  const created = await (channel as TextChannel).send(payload);
  config.panels[key] = { channelId: channel.id, messageId: created.id };
  await store.save();
  if (previous && previous.messageId !== created.id) {
    try {
      if (previousMessage) {
        await previousMessage.delete();
      } else {
        const oldChannel = await guild.channels.fetch(previous.channelId);
        if (oldChannel?.type === ChannelType.GuildText) {
          const oldMessage = await (oldChannel as TextChannel).messages.fetch(previous.messageId);
          await oldMessage.delete();
        }
      }
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: number }).code
          : undefined;
      if (code !== 10003 && code !== 10008) throw error;
    }
  }
  return created;
}

export async function upsertAllPanels(
  guild: Guild,
  config: ServerConfig,
  store: JsonStore,
): Promise<void> {
  for (const key of Object.keys(panelChannels) as (keyof typeof panelChannels)[]) {
    await upsertPanel(guild, config, key, store);
  }
}
