import { Events } from "discord.js";
import { logger } from "../lib/logger.lib.js";
import { safeReply } from "../lib/safe-reply.js";

export const name = Events.InteractionCreate;
export const once = false;

/**
 * @typedef {import("discord.js").Client & {commands: import("discord.js").Collection<string, any>}} ExtendedClient
 */

/**
 * Handles the InteractionCreate event
 * @param {import("discord.js").Interaction & {client: ExtendedClient}} interaction - The interaction object with extended client
 * @returns {Promise<void>} - A promise that resolves when the interaction is handled
 */
export async function execute(interaction) {
  // Only handle chat input commands
  if (!interaction.isChatInputCommand()) return;

  // Retrieve the command from the client's commands collection
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.error(`No command found for ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    await safeReply(interaction, {
      content: "There was an error while executing this command!",
    });
  }
}
