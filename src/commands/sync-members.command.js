import { SlashCommandBuilder } from "discord.js";
import { safeReply } from "../lib/safe-reply.js";
import { to } from "../lib/to.lib.js";
import { AlbionAPI } from "../services/albion-api.js";

export const data = new SlashCommandBuilder();

data
  .setName("sync-members")
  .setDescription("Syncs guild members with the events");

export async function execute(interaction) {
  await interaction.deferReply();

  const [syncError, syncResult] = await to(
    AlbionAPI.syncGuildMembersWithDatabase(interaction.guild.id)
  );
  if (syncError) {
    await safeReply(interaction, {
      content:
        "There was an error syncing guild members. Please try again later.",
    });
    return;
  }

  await safeReply(interaction, {
    content: `Successfully synced guild members events. Removed ${syncResult.removed} members no longer in the guild.`,
  });
}
