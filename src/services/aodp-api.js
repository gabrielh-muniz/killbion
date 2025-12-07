import { to } from "../lib/to.lib.js";
import { query } from "../database/connection.database.js";

const groupsMapId = {
  TORCH: { start: 2300, end: 2449 },
};

export class AodpAPI {
  /**
   * Fetch codes based on the range id
   * @param {string} group - The map containing start and end for groups
   * @returns {Promise<Array<string>>} - Array of codes
   */
  static async fetchCodesByRange(group) {
    const range = groupsMapId[group];
    if (!range) {
      throw new Error(`Invalid group: ${group}`);
    }

    const [err, results] = await to(
      query(`SELECT code FROM items WHERE id BETWEEN $1 and $2`, [
        range.start,
        range.end,
      ])
    );
    if (err) {
      throw err;
    }

    return results.rows.map((row) => row.code);
  }
}

AodpAPI.fetchCodesByRange("TORCH").then((codes) => {
  const codeList = codes.join(",");
  console.log(codeList.length);
});
