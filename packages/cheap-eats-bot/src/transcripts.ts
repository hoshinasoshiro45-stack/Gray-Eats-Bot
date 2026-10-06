import { AttachmentBuilder, type Message, type TextChannel } from "discord.js";
import type { TicketRecord } from "./domain.js";

const PAGE_SIZE = 100;
const MAX_MESSAGES = 10_000;
const MAX_PART_BYTES = 4_000_000;

function messageText(message: Message): string {
  const sections: string[] = [];
  if (message.content) sections.push(message.content);

  for (const embed of message.embeds) {
    const embedText = [embed.title, embed.description].filter(Boolean).join("\n");
    if (embedText) sections.push(`[Embed]\n${embedText}`);
  }

  for (const attachment of message.attachments.values()) {
    sections.push(`[Attachment: ${attachment.name ?? "file"}] ${attachment.url}`);
  }

  if (!sections.length && message.components.length) {
    sections.push("[Message with interactive components]");
  }
  return sections.join("\n");
}

function chunkLines(lines: string[]): string[] {
  const chunks: string[] = [];
  let currentLines: string[] = [];
  let currentBytes = 0;

  for (const line of lines) {
    const lineBytes = Buffer.byteLength(`${line}\n`, "utf8");
    if (currentLines.length && currentBytes + lineBytes > MAX_PART_BYTES) {
      chunks.push(`${currentLines.join("\n")}\n`);
      currentLines = [];
      currentBytes = 0;
    }
    currentLines.push(line);
    currentBytes += lineBytes;
  }

  if (currentLines.length) chunks.push(`${currentLines.join("\n")}\n`);
  return chunks;
}

export async function createTranscriptAttachments(
  channel: TextChannel,
  ticket: TicketRecord,
  closedBy: string,
): Promise<AttachmentBuilder[]> {
  const messages: Message[] = [];
  let before: string | undefined;

  while (messages.length < MAX_MESSAGES) {
    const page = await channel.messages.fetch({
      limit: PAGE_SIZE,
      ...(before ? { before } : {}),
    });
    if (page.size === 0) break;

    const pageMessages = [...page.values()];
    messages.push(...pageMessages.slice(0, MAX_MESSAGES - messages.length));
    const oldest = page.reduce(
      (candidate, message) =>
        message.createdTimestamp < candidate.createdTimestamp ? message : candidate,
      page.first()!,
    );
    before = oldest.id;
    if (page.size < PAGE_SIZE) break;
  }

  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const lines = [
    `Cheap Eats ticket transcript`,
    `Ticket: ${ticket.id}`,
    `Type: ${ticket.kind}`,
    `Customer ID: ${ticket.ownerId}`,
    `Closed by ID: ${closedBy}`,
    `Closed at: ${new Date().toISOString()}`,
    messages.length === MAX_MESSAGES
      ? `Note: transcript is limited to the newest ${MAX_MESSAGES.toLocaleString()} messages.`
      : "",
    "",
    ...messages.map((message) => {
      const content = messageText(message) || "[No text content]";
      return `[${message.createdAt.toISOString()}] ${message.author.tag} (${message.author.id})\n${content}`;
    }),
  ].filter((line) => line !== "");

  return chunkLines(lines).map(
    (content, index) =>
      new AttachmentBuilder(Buffer.from(content, "utf8"), {
        name: `ticket-${ticket.id}-transcript-${index + 1}.txt`,
      }),
  );
}
