import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder();

data.setName("ping").setDescription("Replies with Pong!");

export async function execute(interaction) {
  await interaction.reply({ content: "Pong!" });
}
