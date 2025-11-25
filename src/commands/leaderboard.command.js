import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { query } from "../database/connection.database.js";
import { to } from "../lib/to.lib.js";
import { safeReply } from "../lib/safe-reply.js";
import { logger } from "../lib/logger.lib.js";

export const data = new SlashCommandBuilder();

data.setName("leaderboard").setDescription("Shows the guild leaderboard");

export async function execute(interaction) {
  // Fetch guild info based on server Id
  const [guildError, guildData] = await to(
    query("SELECT * FROM guilds WHERE server_id = $1", [interaction.guild.id])
  );
  if (guildError) {
    logger.error(`Database error: ${guildError.message}`);
    await safeReply(interaction, {
      content:
        "There was an error fetching the guild information. Please try again later.",
    });
  }

  if (guildData.rows.length === 0) {
    await safeReply(interaction, {
      content:
        "No guild is registered for this server. Please register a guild first.",
    });
    return;
  }

  const guildId = guildData.rows[0].external_id;

  // Fetch top 10 guilds by kills
  const [dbError, results] = await to(
    query(
      "SELECT killer_name, COUNT(*) as total_kills FROM events WHERE killer_guild_id = $1 GROUP BY killer_name ORDER BY total_kills DESC LIMIT 10",
      [guildId]
    )
  );
  if (dbError) {
    logger.error(`Database error: ${dbError.message}`);
    await safeReply(interaction, {
      content:
        "There was an error fetching the leaderboard. Please try again later.",
    });
    return;
  }
  if (results.rows.length === 0) {
    await safeReply(interaction, {
      content: "No data available for the leaderboard.",
    });
    return;
  }

  const leaderboardList = results.rows;

  // const leaderboardLines = results.rows
  //   .map(
  //     (row, index) =>
  //       `**${index + 1}. ${row.killer_name}** - ${row.total_kills} kills`
  //   )
  //   .join("\n");

  const description = leaderboardList
    .map((player, idx) => {
      const medal =
        idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
      return `${medal} **${player.killer_name}** - ${player.total_kills} kills`;
    })
    .join("\n");

  // Format leaderboard message (embedded)
  const embed = new EmbedBuilder()
    .setTitle("🏆 Guild Leaderboard 🏆")
    .setColor("#FFD700");

  embed.setDescription(description);

  // Fetch total guild fame
  const [fameError, fameResult] = await to(
    query(
      "SELECT SUM(kill_fame) as total_fame FROM events WHERE killer_guild_id = $1",
      [guildId]
    )
  );
  if (fameError) {
    logger.error(`Database error: ${fameError.message}`);
    await safeReply(interaction, {
      content:
        "There was an error fetching guild fame. Please try again later.",
    });
    return;
  }

  // const createdAt = new Date(guildData.rows[0].created_at)
  //   .toISOString()
  //   .split("T")[0]
  //   .replace(/-/g, "/");

  const createdAt = new Date(guildData.rows[0].created_at).toLocaleDateString(
    "pt-BR"
  );

  // const timestamp = Math.floor(
  //   new Date(guildData.rows[0].created_at).getTime() / 1000
  // );

  embed.setFooter({
    text: `Total Guild Fame: ${
      fameResult.rows[0].total_fame || 0
    }\nTracking since: ${createdAt}`,
  });

  // Send the leaderboard reply
  await safeReply(interaction, { embeds: [embed] });
}
