import { logger } from "./lib/logger.lib.js";
import { loadEvents } from "./handlers/event.handler.js";
import { Client, IntentsBitField, Partials } from "discord.js";
import { loadCommands } from "./handlers/command.handler.js";

async function main() {
  logger.info("Creating Discord client...");
  const client = new Client({
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.MessageContent,
      IntentsBitField.Flags.GuildMessageReactions,
    ],
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.Message,
      Partials.Reaction,
      Partials.User,
    ],
  });

  logger.info("Loading events...");
  await loadEvents(client);

  logger.info("Loading commands...");
  // @ts-ignore
  await loadCommands(client);

  logger.info("Logging in bot client...");
  await client.login(process.env.BOT_TOKEN);
}

main().catch((error) => {
  logger.error("Error in main:", error);
  process.exit(1);
});
