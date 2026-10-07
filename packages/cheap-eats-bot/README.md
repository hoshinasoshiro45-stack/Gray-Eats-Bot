# Cheap Eats Discord Bot

A Discord bot source package for a small food-ordering server. Members can open private order and support tickets; payment-specific staff roles receive routed orders; staff complete a checklist before a verifier records completion. The bot also manages restaurant availability, service-status announcements and opt-in notifications, FAQs, transcripts, and verified customer vouches.

## Included restaurant and payment choices

- Domino's
- Papa John's
- Church's Chicken
- Jersey Mike's Subs
- Panda Express
- Auntie Anne's
- Panera Bread
- IHOP — starts unavailable; staff can turn it on when offered
- Smoothie King — starts unavailable; staff can turn it on when offered
- Applebee's
- Tropical Smoothie Cafe
- Sonic
- Buffalo Wild Wings
- Marco's Pizza
- Jim N Nick's Bar-B-Q
- CAVA
- Fluffies Hot Chicken
- Steak 'n Shake
- Taco Cabana
- Raising Cane's Chicken Fingers — pickup only
- McAlister's Deli
- Carl's Jr.
- Whataburger
- Zaxby's
- Red Lobster
- P.F. Chang's
- Jamba
- Playa Bowls
- Five Guys
- The Habit Burger Grill
- Smashburger
- Insomnia Cookies

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
   - Attach Files
   - Manage Channels
   - Manage Roles
3. Configure the runtime values:
   - `DISCORD_TOKEN` — the bot token. Store this as a Replit Secret or your host's secret, never in chat or Git.
   - `DISCORD_CLIENT_ID` — the application ID.
   - `DISCORD_GUILD_ID` — the test server ID where slash commands should be registered.
   - On Replit, set the token in Secrets and the two IDs as environment variables. For another host, use a private `.env` based on `.env.example`.
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

Server administrators always retain bot-management access. Use `/access grant @user`, `/access revoke @user`, and `/access list` to manage who else may run management commands. Only server administrators can change this access list. Order and support panels remain available to server members, while staff roles continue to control ticket actions.

Run `/setup` as a server administrator or an approved manager and select the channels and roles:

- **Channels:** order panel, support panel, menu, FAQ, status, ticket category, completed orders, vouches, and a private transcript archive.
- **Staff role:** can claim and close tickets.
- **Unclaim role:** controls who can unclaim a ticket.
- **Verifier role:** can submit the final charge and complete an order.
- **Status notification role:** members can add or remove this role with the Notifications button. Staff can mention subscribers when opening orders with `ping: true`.
- **Payment route roles:** one role each for Cash App, Crypto, Zelle, and Venmo. The selected role is mentioned and granted access to its routed order ticket; members of that role can claim it.

Run `/setup` once to establish the configuration. After that, each setting can be changed individually with `/set-order-channel`, `/set-support-channel`, `/set-menu-channel`, `/set-faq-channel`, `/set-status-channel`, `/set-ticket-category`, `/set-completed-orders-channel`, `/set-vouches-channel`, `/set-transcripts-channel`, `/set-staff-role`, `/set-unclaim-role`, `/set-verifier-role`, `/set-status-ping-role`, `/set-cash-app-role`, `/set-crypto-role`, `/set-zelle-role`, or `/set-venmo-role`. `/setup` remains available as the all-in-one shortcut. `/menu` republishes the full list, and `/restaurant` switches an individual restaurant on or off.

Keep the transcript archive staff-only because transcripts can contain customer contact or delivery details. The ticket category should be private to the bot and the roles that should see tickets. The bot creates private channels and grants access to the customer, configured staff, the selected payment route, unclaim role, and verifier role while denying `@everyone`. Place the bot's highest role above the status notification role so it can add or remove subscriptions. Make the notification and payment-route roles mentionable, or grant the bot permission to mention roles.

The status starts as Closed. Configure it with `/status`:

- `/status state:Open ping:true` replaces the previous status post, renames the channel to `『🟢』 open`, and mentions subscribed members.
- `/status state:Slow` replaces the post and renames the channel to `『🟡』 slow`.
- `/status state:Closed` replaces the post and renames the channel to `『🔴』 closed`.

Staff can use `/restaurant` to make a restaurant available or unavailable. IHOP and Smoothie King start unavailable; Raising Cane's orders are pickup only.

## Ticket and vouch behavior

- An order proceeds through category, available restaurant, payment method, and a private form for items, cart total, pickup or delivery details, optional contact, and notes.
- Customers can have one active order ticket and one active support ticket at a time.
- A member of the selected payment route role or the general staff role can claim an open order ticket. Its panel shows the assignee and the routed role.
- The assigned staff member or a server administrator can mark the total, payment, and order-placement checklist items. A verifier cannot complete the order until all three are marked.
- Only the configured unclaim role (or a server administrator) can unclaim an open ticket.
- Only the verifier role (or a server administrator) can complete a claimed order after all checklist items are checked. Completion asks for the final charge and posts the restaurant, payment, charge, ticket, assigned staff member, verifier, customer, and elapsed time in the completed-orders channel.
- The ticket owner, general staff, or routed payment team can close a ticket. The bot saves a transcript in the configured archive channel, shows a 5-second countdown, then deletes the ticket channel and its original messages and clears the ticket's active form data from local state. The archived transcript remains. The bot needs Manage Channels permission to delete ticket channels.
- The customer can submit one vouch from their completed-order post. Vouches are posted in the configured vouches channel.

The bot does not collect card numbers, account passwords, payment credentials, or process a charge. Contact and delivery details are visible to the customer and configured ticket roles. Open ticket form data is stored locally in `data/state.json` so the bot can survive restarts; closing the ticket removes that active record. Completed-order summaries and vouch records remain in the state file so vouches can be verified and duplicate submissions prevented. Keep that file private and use a host with persistent storage.

## Checks

```sh
pnpm --filter @workspace/cheap-eats-bot run typecheck
pnpm run typecheck
```
