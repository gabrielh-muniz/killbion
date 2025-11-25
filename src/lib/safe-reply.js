import { logger } from "./logger.lib.js";

export async function safeReply(interaction, message) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(message);
    }
    return await interaction.reply(message);
  } catch (error) {
    logger.error("Error sending reply:", error);
  }
}
