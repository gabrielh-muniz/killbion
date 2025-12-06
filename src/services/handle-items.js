import { createWriteStream, promises as fs } from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { logger } from "../lib/logger.lib.js";
import { to } from "../lib/to.lib.js";
import { query } from "../database/connection.database.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const streamPipeline = promisify(pipeline);

const DATA_DIR = join(__dirname, "../../data");
const LOCAL_PATH = join(DATA_DIR, "items.txt");

const VALID_CATEGORY = [
  "OFF",
  "CAPEITEM",
  "BAG",
  "2H",
  "HEAD",
  "ARMOR",
  "SHOES",
  "MAIN",
];

// Regex pattern: T<number>_<UppercaseAlphanumeric>_<anything>
const CODE_PATTERN = /^T(\d+)_([A-Z0-9]+)(?:_.*)?$/;

export class HandleItems {
  /**
   * Download the items file from a remote source
   * @param {string} url - The URL to download the items file from
   */
  static async downloadItemsFile(url) {
    if (!url) throw new Error("URL is required to download items file.");

    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    logger.info(`Downloading items file from ${url}...`);

    const [err, response] = await to(fetch(url));
    if (err || !response.ok)
      throw new Error(
        `Failed to download items file: ${err || response.statusText}`
      );

    const writable = createWriteStream(LOCAL_PATH);
    await streamPipeline(response.body, writable);

    logger.info("Items file downloaded successfully.");
  }

  /**
   * Parse the items file lines. Some lines may have blank fields -> remove it
   * @param {string} line - A line from the items file
   * @returns {Object | null} - Parsed item object
   */
  static parseLine(line) {
    // Expected pattern: "<id>: <unique_code>: <english_name>"
    // Be tolarant to extra spaces
    const parts = line.split(":");
    if (parts.length < 3) return null;

    const id = parts[0].trim();
    const code = parts[1].trim();
    const name = parts.slice(2).join(":").trim();

    // Validate fields
    if (!id || !code || !name) return null;
    if (!/^\d+$/.test(id)) return null;

    const codeMatch = code.match(CODE_PATTERN);
    if (!codeMatch) return null;

    const category = codeMatch[2];
    if (!VALID_CATEGORY.includes(category)) return null;

    return { id: Number(id), code, name };
  }

  /**
   * Parse the items file
   * @param {string} filePath - Path to the items file
   * @returns {Promise<Array>} - Array of parsed item objects
   */
  static async parseItemsFile(filePath = LOCAL_PATH) {
    logger.info(`Parsing items file at ${filePath}...`);
    const [err, data] = await to(fs.readFile(filePath, "utf-8"));
    if (err) {
      logger.error("Error reading items file:", err);
      return [];
    }

    // Normalize line endings and filter blanks
    const lines = data.split(/\r?\n/).filter((line) => line.trim().length > 0);

    const items = [];

    for (const line of lines) {
      const parsed = this.parseLine(line);
      if (parsed) items.push(parsed);
    }
    logger.info(`Parsed ${items.length} items from the file.`);
    return items;
  }

  /**
   * Store items into the database
   * @param {Array} items - Array of item objects to store
   * @returns {Promise<Object>} - A promise that resolves when items are stored
   */
  static async storeItemsInDB(items) {
    if (!Array.isArray(items) || items.length === 0) {
      logger.warn("No items to store in the database.");
      return { inserted: 0, upserted: 0 };
    }

    logger.info(`Storing ${items.length} items into the database...`);

    let inserted = 0;

    try {
      await query("BEGIN", []);

      for (const item of items) {
        const [err] = await to(
          query(
            `INSERT INTO items (id, code, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET
             code = EXCLUDED.code,
             name = EXCLUDED.name`,
            [item.id, item.code, item.name]
          )
        );
        if (!err) inserted++;
        else logger.error(`Failed upsert for id=${item.id}: ${err.message}`);
        await query("COMMIT", []);
      }
    } catch (err) {
      await query("ROLLBACK", []);
      throw err;
    }

    logger.info(`Items stored successfully. Total upserted: ${inserted}`);
    return { inserted };
  }

  /**
   * Main handler to download, parse, and store items
   * @param {string} url - URL to download the items file from
   */
  static async handleItems(url) {
    try {
      await this.downloadItemsFile(url);
      const items = await this.parseItemsFile();
      const result = await this.storeItemsInDB(items);
      logger.info(`HandleItems completed: ${result.inserted} items upserted.`);
    } catch (error) {
      logger.error("Error in HandleItems:", error);
    }
  }
}

/*
// Example usage:
  HandleItems.handleItems(process.env.ITEMS_FILE_URL).catch((err) => {
    logger.error("Unhandled error in HandleItems:", err);
  });
*/
