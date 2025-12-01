import { SlashCommandBuilder } from "discord.js";
import { safeReply } from "../lib/safe-reply.js";
import { to } from "../lib/to.lib.js";
import { AlbionAPI } from "../services/albion-api.js";

export const data = new SlashCommandBuilder();

data
  .setName("delete-guild")
  .setDescription("Unbinds the guild from this server");

export async function execute(interaction) {
  await interaction.deferReply();

  const [deletionError, _] = await to(
    AlbionAPI.deleteGuildData(interaction.guild.id)
  );
  if (deletionError) {
    await safeReply(interaction, {
      content:
        "There was an error unbinding the guild from this server. Please try again later.",
    });
    return;
  }

  await safeReply(interaction, {
    content: "The guild has been successfully unbound from this server.",
  });
}
