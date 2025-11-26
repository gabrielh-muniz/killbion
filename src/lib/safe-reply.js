import { MessageFlags } from "discord.js";
import { logger } from "./logger.lib.js";

/**
 *
 * @param {import("discord.js").CommandInteraction} interaction - The interaction type to reply to
 * @param {Object<string, any>} message - The message to send as a reply
 * @returns {Promise<any>} - A promise that resolves when the reply is sent
 */
export async function safeReply(interaction, message) {
  try {
    // If already replied or deferred, use edit or followUp
    if (interaction.replied) {
      return await interaction.editReply(message);
    }
    if (interaction.deferred) {
      return await interaction.followUp(message);
    }

    // Otherwise, use reply
    return await interaction.reply(message);
  } catch (error) {
    logger.error("Error sending reply:", error);

    // Final fallback: attempt to reply if not already done
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "An error occurred while trying to send a message.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (fallbackError) {
      logger.error("Error sending fallback reply:", fallbackError);
    }
  }
}
