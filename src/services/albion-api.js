import { logger } from "../lib/logger.lib.js";
import { to } from "../lib/to.lib.js";
import { query } from "../database/connection.database.js";

const BASE_URL = process.env.BASE_URL;

export class AlbionAPI {
  /**
   * Fetches guild data by name from Albion API
   * @param {string} guildName - The guild name to search for
   * @returns {Promise<Object>} - The guild data
   * @throws {Error} - If the fetch fails or guild not found
   */
  static async fetchGuildByName(guildName) {
    // Validate input
    if (!guildName || typeof guildName !== "string")
      throw new Error("Guild name must be a non-empty string");

    const url = `${BASE_URL}/search?q=${encodeURIComponent(guildName)}`;
    logger.info(`Fetching guild data from URL: ${url}`);

    // Fetch guild data
    const [error, response] = await to(fetch(url));

    if (error) {
      logger.error(`Failed to fetch guild data: ${error.message}`);
      throw new Error("Failed to fetch guild data");
    }

    if (!response.ok) {
      logger.error(
        `Failed to fetch guild data: HTTP status ${response.status}`
      );
      throw new Error("Failed to fetch guild data");
    }

    // Parse JSON response
    const [parseError, data] = await to(response.json());

    if (parseError) {
      logger.error(`Failed to parse guild data: ${parseError.message}`);
      throw new Error("Failed to parse guild data");
    }

    if (!data.guilds || data.guilds.length === 0) {
      logger.error(`Guild not found: ${guildName}`);
      throw new Error("Guild not found");
    }

    return data.guilds[0];
  }

  /**
   * Fetches recent kills for a guild associated with a server
   * @param {string} serverId - The server ID to fetch recent kills for
   * @param {number} limit - The number of recent kills to fetch
   * @param {number} offset - The offset for pagination
   * @returns {Promise<Object>} - The recent kills data
   */
  static async fetchGuildRecentKills(serverId, limit = 51, offset = 0) {
    if (!serverId || typeof serverId !== "string")
      throw new Error("Server ID must be a non-empty string");

    // Fetch the registered guild for the server
    const [fetchGuildError, guildData] = await to(
      query("SELECT * FROM guilds WHERE server_id = $1", [serverId])
    );

    if (fetchGuildError) {
      logger.error(`Database error: ${fetchGuildError.message}`);
      throw new Error("Failed to fetch guild from database");
    }

    if (guildData.rows.length === 0) {
      logger.error(`No guild registered for server ID: ${serverId}`);
      throw new Error("No guild registered for this server");
    }

    const guildId = guildData.rows[0].external_id;

    // Fetch recent kills from Albion API
    const url = `${BASE_URL}/events?limit=${limit}&offset=${offset}&guildId=${guildId}`;

    logger.info(`Fetching recent kills from URL: ${url}`);

    const [error, response] = await to(fetch(url));

    if (error) {
      logger.error(`Failed to fetch recent kills: ${error.message}`);
      throw new Error("Failed to fetch recent kills");
    }

    if (!response.ok) {
      logger.error(
        `Failed to fetch recent kills: HTTP status ${response.status}`
      );
      throw new Error("Failed to fetch recent kills");
    }

    // Parse JSON response
    const [parseError, data] = await to(response.json());

    if (parseError) {
      logger.error(`Failed to parse recent kills: ${parseError.message}`);
      throw new Error("Failed to parse recent kills");
    }

    return data;
  }

  /**
   * Syncs events from Albion API with the database for a given server
   * @param {string} serverId - The server ID to sync events for
   * @returns {Promise<Object>} - The result of the sync operation
   */
  static async syncEventsWithDatabase(serverId) {
    if (!serverId || typeof serverId !== "string")
      throw new Error("Server ID must be a non-empty string");

    // Fetch the registered guild for the server
    logger.info(`Starting sync for server ID: ${serverId}`);
    const [fetchGuildError, guildData] = await to(
      query("SELECT * FROM guilds WHERE server_id = $1", [serverId])
    );

    if (fetchGuildError) {
      logger.error(`Database error: ${fetchGuildError.message}`);
      throw new Error("Failed to fetch guild from database");
    }

    if (guildData.rows.length === 0) {
      logger.error(`No guild registered for server ID: ${serverId}`);
      throw new Error("No guild registered for this server");
    }

    // Fetch latest guild data from Albion API
    // Compare the database events with the fetched events
    logger.info(`Fetching latest guild data for sync...`);
    const [fetchError, apiEvents] = await to(
      this.fetchGuildRecentKills(serverId)
    );

    if (fetchError) {
      logger.error(`Error fetching latest guild data: ${fetchError.message}`);
      throw new Error("Failed to fetch latest guild data");
    }

    // Fetch all events from the database for this guild based on the guild id for this server
    logger.info(`Fetching all events from the database for sync...`);
    const [dbEventsError, dbEvents] = await to(
      query(
        "SELECT * FROM events WHERE killer_guild_id = $1 ORDER BY timestamp DESC LIMIT 100",
        [guildData.rows[0].external_id]
      )
    );
    if (dbEventsError) {
      logger.error(`Database error: ${dbEventsError.message}`);
      throw new Error("Failed to fetch events from database");
    }

    // Create a set of existing event IDs for quick lookup
    const eventsSet = new Set(dbEvents.rows.map((event) => event.event_id));

    let updatedCount = 0;

    logger.info(`Starting to sync events...`);
    for (const event of apiEvents) {
      const eventId = event.EventId;

      // If event does not exist in the database, insert it
      if (!eventsSet.has(eventId)) {
        const [insertError, _] = await to(
          query(
            `INSERT INTO events (
              event_id,
              timestamp,
              killer_avg_power,
              killer_name,
              killer_id,
              killer_guild_id,
              victim_avg_power,
              victim_name,
              victim_id,
              victim_guild_id,
              kill_fame,
              kill_area
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            )`,
            [
              event.EventId,
              event.TimeStamp,
              event.Killer.AverageItemPower,
              event.Killer.Name,
              event.Killer.Id,
              event.Killer.GuildId,
              event.Victim.AverageItemPower,
              event.Victim.Name,
              event.Victim.Id,
              event.Victim.GuildId,
              event.TotalVictimKillFame,
              event.KillArea,
            ]
          )
        );
        if (insertError) {
          logger.error(`Database error: ${insertError.message}`);
          continue;
        }

        logger.info(`Inserted new event with ID: ${eventId}`);
        eventsSet.add(eventId);
        updatedCount++;
      }
    }

    logger.info(
      `Sync complete. ${updatedCount} new events added to the database.`
    );
    return {
      inserted: updatedCount,
    };
  }

  /**
   * Fetches guild members binded to a server
   * @param {string} serverId - The server ID to fetch guild members for
   * @returns {Promise<Array>} - The list of guild members
   */
  static async fetchGuildMembers(serverId) {
    if (!serverId || typeof serverId !== "string")
      throw new Error("Server ID must be a non-empty string");

    // Fetch the registered guild for the server
    const [fetchGuildError, guildData] = await to(
      query("SELECT * FROM guilds WHERE server_id = $1", [serverId])
    );
    if (fetchGuildError) {
      logger.error(`Database error: ${fetchGuildError.message}`);
      throw new Error("Failed to fetch guild from database");
    }

    if (guildData.rows.length === 0) {
      logger.error(`No guild registered for server ID: ${serverId}`);
      throw new Error("No guild registered for this server");
    }

    const guildId = guildData.rows[0].external_id;

    // Fetch guild members from Albion API
    const url = `${BASE_URL}/guilds/${guildId}/members`;

    logger.info(`Fetching guild members from URL: ${url}`);
    const [error, response] = await to(fetch(url));
    if (error) {
      logger.error(`Failed to fetch guild members: ${error.message}`);
      throw new Error("Failed to fetch guild members");
    }

    if (!response.ok) {
      logger.error(
        `Failed to fetch guild members: HTTP status ${response.status}`
      );
      throw new Error("Failed to fetch guild members");
    }

    // Parse JSON response
    const [parseError, data] = await to(response.json());
    if (parseError) {
      logger.error(`Failed to parse guild members: ${parseError.message}`);
      throw new Error("Failed to parse guild members");
    }

    return data;
  }

  /**
   * Deletes all a guild's events from the database as well as the guild entry itself
   * @param {string} serverId - The server ID to delete guild data for
   * @return {Promise<void>}
   */
  static async deleteGuildData(serverId) {
    if (!serverId || typeof serverId !== "string")
      throw new Error("Server ID must be a non-empty string");

    // Fetch the registered guild for the server
    const [fetchGuildError, guildData] = await to(
      query("SELECT * FROM guilds WHERE server_id = $1", [serverId])
    );
    if (fetchGuildError) {
      logger.error(`Database error: ${fetchGuildError.message}`);
      throw new Error("Failed to fetch guild from database");
    }

    if (guildData.rows.length === 0) {
      logger.error(`No guild registered for server ID: ${serverId}`);
      throw new Error("No guild registered for this server");
    }

    const guildId = guildData.rows[0].external_id;

    // Delete events associated with the guild
    const [deleteEventsError, _] = await to(
      query("DELETE FROM events WHERE killer_guild_id = $1", [guildId])
    );
    if (deleteEventsError) {
      logger.error(`Database error: ${deleteEventsError.message}`);
      throw new Error("Failed to delete guild events from database");
    }

    // Delete the guild entry
    const [deleteGuildError, __] = await to(
      query("DELETE FROM guilds WHERE server_id = $1", [serverId])
    );
    if (deleteGuildError) {
      logger.error(`Database error: ${deleteGuildError.message}`);
      throw new Error("Failed to delete guild from database");
    }

    logger.info(`Successfully deleted guild data for server ID: ${serverId}`);
  }

  /**
   * Sync guild members with the database for a given server
   * @param {string} serverId - The server ID to sync guild members for
   * @returns {Promise<{ removed: number }>} - The result of the sync operation
   */
  static async syncGuildMembersWithDatabase(serverId) {
    if (!serverId || typeof serverId !== "string")
      throw new Error("Server ID must be a non-empty string");

    logger.info("Fetching guild members for sync...");
    const [apiError, members] = await to(this.fetchGuildMembers(serverId));
    if (apiError) {
      logger.error(`Error fetching guild members: ${apiError.message}`);
      throw new Error("Failed to fetch guild members");
    }
    logger.info(`Fetched ${members.length} guild members.`);

    // Fetch unique member IDs from events table for this guild
    const [dbError, dbEventsId] = await to(
      query(
        `SELECT DISTINCT killer_id AS member_id FROM events
         WHERE killer_guild_id = (
           SELECT external_id FROM guilds WHERE server_id = $1
         )`,
        [serverId]
      )
    );
    if (dbError) {
      logger.error(`Database error: ${dbError.message}`);
      throw new Error("Failed to fetch members from database");
    }

    // Compare the fetched member with the database records

    const fetchedMemberIdApi = new Set(members.map((member) => member.Id));
    const fetchedMemberIdDb = new Set(
      dbEventsId.rows.map((row) => row.member_id)
    );

    // Difference: member in database events but not in API
    // Remove events for players that are no longer in the guild
    const eventsMemberToRemove = [...fetchedMemberIdDb].filter(
      (id) => !fetchedMemberIdApi.has(id)
    );

    let removedCount = 0;
    for (const memberId of eventsMemberToRemove) {
      const [deleteError, _] = await to(
        query("DELETE FROM events WHERE killer_id = $1", [memberId])
      );
      if (deleteError) {
        logger.error(`Database error: ${deleteError.message}`);
        continue;
      }
      logger.info(`Removed events for member ID: ${memberId}`);
      removedCount++;
    }
    logger.info(`Total events removed: ${removedCount}`);

    return { removed: removedCount };
  }

  /**
   * Fetches guild data by server ID from API. Don't store in DB.
   * @param {string} serverId - The server ID to fetch guild data for
   * @returns {Promise<Object>} - The guild data
   * @throws {Error} - If the fetch fails or guild not found
   */
  static async fetchGuildData(serverId) {
    if (!serverId || typeof serverId !== "string")
      throw new Error("Server ID must be a non-empty string");

    // Fetch guild associated with the server
    const [fetchGuildError, guildData] = await to(
      query("SELECT * FROM guilds WHERE server_id = $1", [serverId])
    );

    if (fetchGuildError) {
      logger.error(`Database error: ${fetchGuildError.message}`);
      throw new Error("Failed to fetch guild from database");
    }

    if (guildData.rows.length === 0) {
      logger.error(`No guild registered for server ID: ${serverId}`);
      throw new Error("No guild registered for this server");
    }

    const guildId = guildData.rows[0].external_id;

    // Fetch guild data from Albion API
    const url = `${BASE_URL}/guilds/${guildId}/data`;

    logger.info(`Fetching guild data from URL: ${url}`);

    const [error, response] = await to(fetch(url));

    if (error) {
      logger.error(`Failed to fetch guild data: ${error.message}`);
      throw new Error("Failed to fetch guild data");
    }

    if (!response.ok) {
      logger.error(
        `Failed to fetch guild data: HTTP status ${response.status}`
      );
      throw new Error("Failed to fetch guild data");
    }

    // Parse JSON response
    const [parseError, data] = await to(response.json());

    if (parseError) {
      logger.error(`Failed to parse guild data: ${parseError.message}`);
      throw new Error("Failed to parse guild data");
    }
    return {
      id: data.guild.Id,
      name: data.guild.Name,
      founder: data.guild.FounderName,
      memberCount: data.basic.memberCount,

      // Fame stats
      stats: {
        killFame: data.guild.killFame,
        deathFame: data.guild.DeathFame,
      },

      // Kill/Death stats
      pvp: {
        kills: data.overall.kills,
        deaths: data.overall.deaths,
        fame: data.overall.fame,
      },

      // top 5 players
      topPlayers: data.topPlayers.map((player) => ({
        id: player.Id,
        name: player.Name,
        killFame: player.KillFame,
        deathFame: player.DeathFame,
        ratio: player.FameRatio,
        totalKills: player.totalKills,
      })),
    };
  }
}
