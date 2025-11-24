import { logger } from "./lib/logger.lib.js";
import { loadEvents } from "./handlers/event.handler.js";
import { Client, Collection } from "discord.js";
import { botConfig } from "./config/bot.config.js";
import { loadCommands } from "./handlers/command.handler.js";

async function main() {
  logger.info("Creating Discord client...");
  const client = new Client(botConfig.config);

  logger.info("Loading events...");
  await loadEvents(client);

  logger.info("Loading commands...");
  await loadCommands(client);

  logger.info("Logging in bot client...");
  await client.login(process.env.BOT_TOKEN);
}

main().catch((error) => {
  logger.error("Error in main:", error);
  process.exit(1);
});
