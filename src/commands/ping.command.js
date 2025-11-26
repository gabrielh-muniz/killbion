import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder();

data.setName("ping").setDescription("Replies with Pong!");

/**
 * Command function that replies with Pong!
 * @param {import("discord.js").CommandInteraction} interaction - The command interaction object
 * @returns {Promise<void>} - A promise that resolves when the command execution is complete
 */
export async function execute(interaction) {
  await interaction.reply({ content: "Pong!" });
}
