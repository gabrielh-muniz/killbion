import { Pool } from "pg";
import { logger } from "../lib/logger.lib.js";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("connect", () => {
  logger.info("Connected to the database");
});

pool.on("error", (err) => {
  logger.error(`Database error: ${err.message}`);
  process.exit(-1);
});

/**
 * Executes a query on the database
 * @param {string} text - SQL query text
 * @param {Array<string>} params - Query parameters
 * @returns {Promise}
 */
export function query(text, params) {
  return pool.query(text, params);
}
