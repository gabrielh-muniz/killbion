import { Events } from "discord.js";
import { logger } from "../lib/logger.lib.js";
import { cmd } from "../utils/register-cmd.utils.js";

export const name = Events.ClientReady;
export const once = true;

/**
 * Handles the ClientReady event
 * @param {import("discord.js").Client} client - The Discord client instance
 */
export async function execute(client) {
  logger.info(`Bot is ready! Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: "for commands", type: 3 }],
    status: "online",
  });

  try {
    await cmd();
  } catch (error) {
    logger.error("Error on ready event:", error);
  }
}
