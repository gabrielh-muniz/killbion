import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { AlbionAPI } from "../services/albion-api.js";
import { logger } from "../lib/logger.lib.js";
import { to } from "../lib/to.lib.js";
import { safeReply } from "../lib/safe-reply.js";

export const data = new SlashCommandBuilder();

data
  .setName("guild-info")
  .setDescription("Displays detailed information about the guild.");

export async function execute(interaction) {
  await interaction.deferReply();

  const [error, guildInfo] = await to(
    AlbionAPI.fetchGuildData(interaction.guild.id)
  );
  if (error) {
    logger.error(`Error fetching guild info: ${error.message}`);
    await interaction.editReply(
      "There was an error fetching the guild information. Please try again later."
    );
    return;
  }

  // Create embed with guild information
  const embed = new EmbedBuilder()
    .setTitle(`🛡️ ${guildInfo.name}`)
    .setColor("#FFD700")
    .addFields(
      {
        name: "👑 Founder",
        value: guildInfo.founder,
        inline: true,
      },
      {
        name: "👥 Members",
        value: guildInfo.memberCount.toString(),
        inline: true,
      },
      {
        name: "✨ Fame",
        value: [
          `Kill Fame: **${guildInfo.stats.killFame}**`,
          `Death Fame: **${guildInfo.stats.deathFame}**`,
          `Overall: **${guildInfo.pvp.fame}**`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "⚔️ PvP Stats",
        value: [
          `Kills: **${guildInfo.pvp.kills}**`,
          `Deaths: **${guildInfo.pvp.deaths}**`,
          `K/D Ratio: **${(guildInfo.pvp.kills / guildInfo.pvp.deaths).toFixed(
            2
          )}**`,
        ].join("\n"),
        inline: true,
      }
    );

  if (guildInfo.topPlayers.length > 0) {
    const topPlayersText = guildInfo.topPlayers
      .map((player, idx) => {
        return `${idx + 1}. **${player.name}** - ${
          player.totalKills
        } kills\n\tKill Fame: **${player.killFame}**\n\tDeath Fame: **${
          player.deathFame
        }**\n\tFame Ratio: **${player.ratio.toFixed(2)}**\n`;
      })
      .join("\n");

    embed.addFields({
      name: "🏆 Top 5 Players",
      value: topPlayersText,
    });
  }

  await safeReply(interaction, { embeds: [embed] });
}
