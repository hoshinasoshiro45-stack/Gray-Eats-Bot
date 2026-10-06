import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  RESTAURANTS,
  type BotState,
  type ServerConfig,
  type TicketRecord,
} from "./domain.js";

function emptyState(): BotState {
  return {
    servers: {},
    tickets: {},
    activeTickets: {},
    completedOrders: {},
    vouches: {},
  };
}

export function activeTicketKey(
  guildId: string,
  userId: string,
  kind: TicketRecord["kind"],
): string {
  return `${guildId}:${userId}:${kind}`;
}

export function createServerConfig(
  guildId: string,
  channels: ServerConfig["channels"],
  roles: ServerConfig["roles"],
  previous?: ServerConfig,
): ServerConfig {
  const restaurants = Object.fromEntries(
    RESTAURANTS.map(({ id, availableByDefault }) => [
      id,
      previous?.restaurants[id] ?? availableByDefault,
    ]),
  ) as ServerConfig["restaurants"];

  return {
    guildId,
    channels,
    roles,
    restaurants,
    status: previous?.status ?? {
      state: "closed",
      reason: "Service is not open yet.",
      updatedBy: "",
      updatedAt: Date.now(),
    },
    panels: previous?.panels ?? {},
  };
}

export class JsonStore {
  private readonly filePath: string;
  private state: BotState = emptyState();
  private writeChain: Promise<void> = Promise.resolve();

  constructor(filePath = process.env.DATA_FILE) {
    this.filePath = filePath
      ? path.resolve(filePath)
      : path.resolve(process.cwd(), "data", "state.json");
  }

  async load(): Promise<void> {
    try {
      const contents = await readFile(this.filePath, "utf8");
      this.state = JSON.parse(contents) as BotState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.state = emptyState();
        return;
      }
      throw new Error(`Could not read bot state at ${this.filePath}`, { cause: error });
    }
  }

  getState(): BotState {
    return this.state;
  }

  getServer(guildId: string): ServerConfig | undefined {
    return this.state.servers[guildId];
  }

  getTicket(channelId: string): TicketRecord | undefined {
    return this.state.tickets[channelId];
  }

  async save(): Promise<void> {
    const snapshot = JSON.stringify(this.state, null, 2);
    const temporaryPath = `${this.filePath}.tmp`;
    this.writeChain = this.writeChain.catch(() => undefined).then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(temporaryPath, snapshot, { encoding: "utf8", mode: 0o600 });
      await rename(temporaryPath, this.filePath);
    });
    await this.writeChain;
  }
}
