import { SlashCommandBuilder } from "discord.js";
import { AlbionAPI } from "../services/albion-api.js";
import { to } from "../lib/to.lib.js";
import { logger } from "../lib/logger.lib.js";
import { safeReply } from "../lib/safe-reply.js";

export const data = new SlashCommandBuilder();

data.setName("sync").setDescription("Syncs commands with Discord API");

/**
 * Command function that syncs events from Albion Online API with the database
 * @param {import("discord.js").CommandInteraction} interaction - The command interaction object
 * @returns {Promise<void>} - A promise that resolves when the command execution is complete
 */
export async function execute(interaction) {
  // CRITICAL: Defer reply immediately to avoid timeout
  await interaction.deferReply();

  const [error, result] = await to(
    AlbionAPI.syncEventsWithDatabase(interaction.guild.id)
  );

  if (error) {
    logger.error(`Error syncing events: ${error.message}`);
    await safeReply(interaction, {
      content: "There was an error syncing events. Please try again later.",
    });
    return;
  }

  await safeReply(interaction, {
    content: `Events synced successfully! ${result.inserted} new events added.`,
  });
}
