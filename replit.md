# Cheap Eats Discord Bot Source

TypeScript source for a Discord food-ordering bot with private tickets, restaurant availability, order status announcements, order verification, and customer vouches.

## Run & Operate

- `pnpm --filter @workspace/cheap-eats-bot run deploy-commands` — register server slash commands
- `pnpm --filter @workspace/cheap-eats-bot run start` — run the Discord Gateway bot
- `pnpm --filter @workspace/cheap-eats-bot run typecheck` — typecheck the bot package
- `pnpm run typecheck` — typecheck the workspace
- Required bot env: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`

## Stack

- pnpm workspace, Node.js 20+, TypeScript, Discord.js 14
- Discord Gateway interactions and slash commands
- JSON file persistence for server setup, active tickets, completed orders, and vouches
- No payment processing; payment methods are recorded only

## Where things live

- `packages/cheap-eats-bot/src/domain.ts` — restaurants, accepted payment methods, and state types
- `packages/cheap-eats-bot/src/commands.ts` — slash command definitions
- `packages/cheap-eats-bot/src/index.ts` — bot startup and interaction handlers
- `packages/cheap-eats-bot/src/ui.ts` — Discord panels, forms, ticket cards, and embeds
- `packages/cheap-eats-bot/src/store.ts` — private local JSON state
- `packages/cheap-eats-bot/README.md` — GitHub, Discord, and host setup
- `packages/cheap-eats-bot/.env.example` — required runtime variable names; contains no credentials

## Architecture decisions

- Server channels and roles are selected with `/setup` and saved locally rather than hard-coded into source.
- Tickets are private Discord text channels; `@everyone` is denied access and ticket-specific roles are granted access.
- The bot uses a persistent JSON file so it can run without provisioning a database. Host the file on persistent storage.
- A customer can submit one vouch per verified completed order.

## Product

- Restaurant choices: Wingstop, Cinnabon, Chili's, Dave's Hot Chicken (staff-toggleable), and Shake Shack.
- Accepted payment selections: Cash App, Crypto, Zelle, Venmo. Apple Pay, PayPal, and Chime are excluded.
- Order and general-support ticket panels, status panel, FAQ, menu list, verified completion posts, and vouches.
- Staff claim/close controls, role-restricted unclaim, and verifier-only order completion.

## User preferences

- No chef-specific support or ticket features.
- Do not add walkthrough, pricing, or change-restaurant controls from the unrelated example screenshot.

## Gotchas

- Register commands with `deploy-commands` after changing slash command definitions.
- The bot needs a long-running process and persistent storage for `data/state.json`.
- Keep `.env` and the bot's local `data/` directory out of Git.

## Pointers

- The main project is a pnpm monorepo; push the project root to GitHub so workspace dependencies and scripts remain available.
