# Cheap Eats Discord Bot

A Discord bot source package for a small food-ordering server. Members can open private order and support tickets; staff can claim tickets; only the configured verifier role can complete orders. The bot also manages restaurant availability, service-status announcements, FAQs, and verified customer vouches.

## Included restaurant and payment choices

- Wingstop
- Cinnabon
- Chili's
- Dave's Hot Chicken — starts unavailable; staff can turn it on when it is being offered
- Shake Shack

Accepted payment selections are Cash App, Crypto, Zelle, and Venmo. Apple Pay, PayPal, and Chime are not included. The bot records a selected payment method; it does not process payments.

## Put the source in a private GitHub repository

This bot is a package in the project pnpm workspace. To preserve its scripts and dependency setup, put the **project root** in your private GitHub repository rather than copying only the `packages/cheap-eats-bot` directory. The bot source itself is in this folder.

Before pushing:

- Keep `.env` and `packages/cheap-eats-bot/data/` out of Git. They are already ignored.
- Do not paste the bot token into source files, screenshots, or chat.
- Do not commit a real `.env`; use `.env.example` as the template.

## Requirements

- Node.js 20 or newer
- pnpm
- A Discord application with a bot user
- A persistent host that can keep a Node.js process online and preserve the bot's `data/state.json` file

This is a long-running Discord Gateway bot, not a web app. A host that stops idle processes or discards its filesystem will interrupt the bot or lose its saved setup and ticket state.

## Run it

1. Create a Discord application in the Discord Developer Portal and add a bot user.
2. Invite it to your server with the `bot` and `applications.commands` scopes. Grant it:
   - View Channels
   - Send Messages
   - Read Message History
   - Embed Links
   - Manage Channels
3. Copy `.env.example` to `.env` in `packages/cheap-eats-bot/` and fill in:
   - `DISCORD_TOKEN` — the bot token; store it as a host secret when deploying.
   - `DISCORD_CLIENT_ID` — the application ID.
   - `DISCORD_GUILD_ID` — the server ID where slash commands should be registered.
4. From the project root, install dependencies:

   ```sh
   pnpm install
   ```

5. Register the slash commands in the selected server:

   ```sh
   pnpm --filter @workspace/cheap-eats-bot run deploy-commands
   ```

6. Start the bot:

   ```sh
   pnpm --filter @workspace/cheap-eats-bot run start
   ```

## Configure the server

Run `/setup` as a server administrator and select the channels and roles:

- **Channels:** order panel, support panel, menu, FAQ, status, ticket category, completed orders, and vouches.
- **Staff role:** can claim and close tickets.
- **Unclaim role:** controls who can unclaim a ticket.
- **Verifier role:** can submit the final charge and complete an order.
- **Status ping role:** is mentioned only when staff set status to Open and choose `ping: true`.

The ticket category should be private to the bot and the roles that should see the tickets. The bot applies channel permissions to each newly created ticket so the customer, staff, unclaim, and verifier roles can access it while `@everyone` cannot. Make the configured status ping role mentionable, or grant the bot permission to mention roles.

The status starts as Closed. Configure it with `/status`:

- `/status state:Open ping:true` updates the panel and announces Open with the configured role mention.
- `/status state:Slow` announces that orders are open with a longer wait expected.
- `/status state:Closed` announces that orders are not being accepted.

Staff can use `/restaurant` to make a restaurant available or unavailable. Dave's Hot Chicken starts unavailable until staff turn it on.

## Ticket and vouch behavior

- An order proceeds through category, available restaurant, payment method, and a private form for items, cart total, pickup or delivery details, optional contact, and notes.
- Customers can have one active order ticket and one active support ticket at a time.
- Staff claim an open ticket. Its panel shows who claimed it.
- Only the configured unclaim role (or a server administrator) can unclaim an open ticket.
- Only the verifier role (or a server administrator) can complete a claimed order. Completion asks for the final charge and posts the restaurant, payment, charge, verifier, customer, and elapsed time in the completed-orders channel.
- The ticket owner or staff can close a ticket. Closing removes the customer's access and clears the ticket's active form data from the bot's local state; the private Discord channel remains available to staff.
- The customer can submit one vouch from their completed-order post. Vouches are posted in the configured vouches channel.

The bot does not collect card numbers, account passwords, payment credentials, or process a charge. Contact and delivery details are visible to the customer and configured ticket roles. Open ticket form data is stored locally in `data/state.json` so the bot can survive restarts; closing the ticket removes that active record. Completed-order summaries and vouch records remain in the state file so vouches can be verified and duplicate submissions prevented. Keep that file private and use a host with persistent storage.

## Checks

```sh
pnpm --filter @workspace/cheap-eats-bot run typecheck
pnpm run typecheck
```
