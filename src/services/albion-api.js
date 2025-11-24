import { logger } from "../lib/logger.lib.js";
import { to } from "../lib/to.lib.js";
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

  static async fetchGuildRecentKills(guildId, limit = 51, offset = 0) {
    if (!guildId || typeof guildId !== "string")
      throw new Error("Guild ID must be a non-empty string");
  }
}
