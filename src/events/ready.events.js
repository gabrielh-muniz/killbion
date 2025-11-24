import { Events } from "discord.js";
import { botConfig } from "../config/bot.config.js";
import { logger } from "../lib/logger.lib.js";
import { cmd } from "../utils/register-cmd.utils.js";

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  logger.info(`Bot is ready! Logged in as ${client.user.tag}`);

  await client.user.setPresence(botConfig.activity);

  await cmd();
}
