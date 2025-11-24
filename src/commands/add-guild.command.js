import { SlashCommandBuilder } from "discord.js";
import { AlbionAPI } from "../services/albion-api.js";
import { query } from "../database/connection.database.js";
import { logger } from "../lib/logger.lib.js";
import { safeReply } from "../lib/safe-reply.js";
import { to } from "../lib/to.lib.js";

export const data = new SlashCommandBuilder();

data
  .setName("add-guild")
  .setDescription("Binds a guild to this server")
  .addStringOption((option) =>
    option
      .setName("name")
      .setDescription("Guild name to track")
      .setRequired(true)
  );

export async function execute(interaction) {
  // Get guild name from interaction options
  const guildName = interaction.options.getString("name");

  if (!guildName || guildName.trim().length === 0) {
    await safeReply(interaction, {
      content: "Please provide a valid guild name.",
    });
    return;
  }

  // Fetch guild data from Albion API
  const [fetchError, guildData] = await to(
    AlbionAPI.fetchGuildByName(guildName.trim())
  );

  if (fetchError) {
    logger.error(`Error fetching guild: ${fetchError.message}`);
    await safeReply(interaction, {
      content: `Could not find guild with name "${guildName}". Please check the name and try again.`,
    });
    return;
  }

  if (!guildData) {
    await safeReply(interaction, {
      content: `Guild "${guildName}" not found.`,
    });
    return;
  }

  const { Id, Name, DeathFame } = guildData;

  // Check if guild is already registered in this server
  const [checkError, existingGuild] = await to(
    query("SELECT * FROM guilds WHERE external_id = $1 AND server_id = $2", [
      guildData.Id,
      interaction.guild.id,
    ])
  );

  if (checkError) {
    logger.error(`Database error: ${checkError.message}`);
    await safeReply(interaction, {
      content: "An error occurred while accessing the database.",
    });
    return;
  }

  if (existingGuild && existingGuild.rowCount > 0) {
    await safeReply(interaction, {
      content: `Guild "${guildData.Name}" is already registered in this server.`,
    });
    return;
  }

  // Insert guild into database
  const [insertError, _] = await to(
    query(
      "INSERT INTO guilds (external_id, guild_name, server_id, death_fame) VALUES ($1, $2, $3, $4)",
      [Id, Name, interaction.guild.id, DeathFame]
    )
  );

  if (insertError) {
    logger.error(`Database error: ${insertError.message}`);
    await safeReply(interaction, {
      content:
        "An error occurred while saving the guild to the database. The guild probably already exists in another server.",
    });
    return;
  }

  await safeReply(interaction, {
    content: `Guild "${Name}" has been successfully added to this server!`,
  });
}
