import { to } from "../lib/to.lib.js";
import { query } from "../database/connection.database.js";
import { writeFileSync } from "fs";

const baseURL = "https://west.albion-online-data.com/api/v2/stats/prices/";

const groupsMapId = {
  TORCH: { start: 2300, end: 2449 },
};

/**
 * @typedef {Object} MarketRow
 * @property {string} item_id
 * @property {string} city
 * @property {number} quality
 * @property {number} sell_price_min
 */

/**
 * @typedef {Object} FlipResult
 * @property {string} item_id
 * @property {number} quality
 * @property {string} buy_city
 * @property {string} sell_city
 * @property {number} buy_price
 * @property {number} sell_price
 * @property {number} profit
 * @property {number} roi
 */

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
      ]),
    );
    if (err) {
      throw err;
    }

    return results.rows.map((row) => row.code);
  }

  /**
   * Fetch prices from the AODP API for given item codes
   * @param {Array<string>} codes - Array of item codes
   * @returns {Promise<Object>} - Prices data from the API
   */
  static async fetchPrices(codes) {
    const url = `${baseURL}${codes.filter(Boolean).join(",")}?locations=7,4002,1002,2004,3008,3005,3003&qualities=1,2,3,4,5`;

    const [err, response] = await to(fetch(url));
    if (err) {
      throw err;
    }

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const [parseErr, data] = await to(response.json());
    if (parseErr) {
      throw parseErr;
    }

    return data;
  }

  /**
   * Ranking the best prices for given group
   * @param {string} group - The group to fetch codes for
   * @returns {Promise<Array<Object>>} - Ranked prices data
   */
  static async rankBestPrices(group) {
    const codes = await to(this.fetchCodesByRange("TORCH"));

    const prices = await to(this.fetchPrices(codes));

    const itemsList = prices[1];

    const groups = new Map();

    // 1. Group by item + quality
    for (const row of itemsList) {
      if (!row.sell_price_min || row.sell_price_min <= 0) continue;

      const key = `${row.item_id}|${row.quality}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(row);
    }

    const results = [];

    // 2. For each group, find best buy and sell prices
    for (const entries of groups.values()) {
      if (entries.length < 2) continue;

      let buy = entries[0];
      let sell = entries[0];

      for (const entry of entries) {
        if (entry.sell_price_min < buy.sell_price_min) {
          buy = entry;
        }
        if (entry.sell_price_min > sell.sell_price_min) {
          sell = entry;
        }
      }

      if (sell.sell_price_min <= buy.sell_price_min) continue;

      const profit = sell.sell_price_min - buy.sell_price_min;

      results.push({
        item_id: buy.item_id,
        quality: buy.quality,
        buy_city: buy.city,
        sell_city: sell.city,
        buy_price: buy.sell_price_min,
        sell_price: sell.sell_price_min,
        profit,
        roi: profit / buy.sell_price_min,
      });
    }

    // 3. Sort by ROI descending
    return results.sort((a, b) => {
      if (b.profit !== a.profit) return b.profit - a.profit;
      return b.roi - a.roi;
    });
  }
}

// AodpAPI.fetchCodesByRange("TORCH").then((codes) => {
//   const codeList = codes.join(",");
//   console.log(codeList);
//   console.log(codeList.length);
// });

// AodpAPI.rankBestPrices("TORCH").then((prices) => {
//   console.log(prices.length);

//   // write in a file
//   //writeFileSync("flip-torch.json", JSON.stringify(prices, null, 2));
// });
