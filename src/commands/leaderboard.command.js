import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { query } from "../database/connection.database.js";
import { to } from "../lib/to.lib.js";
import { safeReply } from "../lib/safe-reply.js";
import { logger } from "../lib/logger.lib.js";

export const data = new SlashCommandBuilder();

data.setName("leaderboard").setDescription("Shows the guild leaderboard");

export async function execute(interaction) {
  // Fetch top 10 guilds by kills
  const [dbError, results] = await to(
    query(
      "SELECT killer_name, COUNT(*) as total_kills FROM events GROUP BY killer_name ORDER BY total_kills DESC LIMIT 10",
      []
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
    query("SELECT SUM(kill_fame) as total_fame FROM events", [])
  );
  if (fameError) {
    logger.error(`Database error: ${fameError.message}`);
    await safeReply(interaction, {
      content:
        "There was an error fetching guild fame. Please try again later.",
    });
    return;
  }

  embed.setFooter({
    text: `Total Guild Fame: ${
      fameResult.rows[0].total_fame || 0
    } | Started from 11/23/2025`,
  });

  // Send the leaderboard reply
  await safeReply(interaction, { embeds: [embed] });
}
