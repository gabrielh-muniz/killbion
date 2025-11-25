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
}

// AlbionAPI.fetchGuildRecentKills("1331218317905760326")
//   .then((data) => {
//     console.log(data);
//   })
//   .catch((err) => {
//     console.error(err);
//   });

// AlbionAPI.syncEventsWithDatabase("1441432910589853750").then(() => {
//   console.log("Sync complete");
// });

(async () => {
  const [dbEventsError, dbEvents] = await to(
    query(
      "SELECT * FROM events WHERE killer_guild_id = $1 ORDER BY timestamp DESC LIMIT 10",
      ["1vn_N9OuSwuJDB_mcOrPag"]
    )
  );
  if (dbEventsError) {
    logger.error(`Database error: ${dbEventsError.message}`);
    throw new Error("Failed to fetch events from database");
  }
  console.log(dbEvents.rows);
})();

// kill counter
// (async () => {
//   const [dbEventsError, dbEvents] = await to(
//     query(
//       "SELECT killer_name, COUNT(*) as total_kills FROM events GROUP BY killer_name ORDER BY total_kills DESC LIMIT 10",
//       []
//     )
//   );
//   if (dbEventsError) {
//     logger.error(`Database error: ${dbEventsError.message}`);
//     throw new Error("Failed to fetch events from database");
//   }
//   console.log(dbEvents.rows);
// })();
