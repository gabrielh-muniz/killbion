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

    return { id: Number(id), code, name };
  }
}
