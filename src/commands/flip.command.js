import { SlashCommandBuilder } from "discord.js";
import { safeReply } from "../lib/safe-reply.js";
import { to } from "../lib/to.lib.js";
import { AodpAPI } from "../services/aodp-api.js";

export const data = new SlashCommandBuilder();

data
  .setName("flip")
  .setDescription("Finds flip opportunities for a given item group")
  .addStringOption((option) =>
    option
      .setName("group")
      .setDescription("The item group to search for flips")
      .setRequired(true)
      .addChoices({ name: "TORCH", value: "TORCH" }),
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const group = interaction.options.getString("group");

  const [err, flipResults] = await to(AodpAPI.rankBestPrices(group));
  if (err) {
    await safeReply(interaction, {
      content:
        "There was an error fetching flip opportunities. Please try again later.",
    });
    return;
  }

  if (flipResults.length === 0) {
    await safeReply(interaction, {
      content: `No flip opportunities found for group: ${group}`,
    });
    return;
  }

  let replyMessage = `Top flip opportunities for group: ${group}\n\n`;
  flipResults.slice(0, 10).forEach((flip) => {
    replyMessage += `Item: ${flip.item_id} (Quality: ${flip.quality})\nBuy in: ${flip.buy_city} for ${flip.buy_price} silver\nSell in: ${flip.sell_city} for ${flip.sell_price} silver\nProfit: ${flip.profit} silver\n\n`;
  });

  await safeReply(interaction, { content: replyMessage });
}
