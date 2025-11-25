import { SlashCommandBuilder } from "discord.js";
import { generateGeminiResponse } from "../services/gemini.js";
import { safeReply } from "../lib/safe-reply.js";

export const data = new SlashCommandBuilder();

data
  .setName("gemini")
  .setDescription("Generates a response using Gemini AI model")
  .addStringOption((option) =>
    option
      .setName("prompt")
      .setDescription("The prompt to send to the Gemini model")
      .setRequired(true)
  );

export async function execute(interaction) {
  // CRITICAL: Defer reply immediately to avoid timeout
  await interaction.deferReply();

  const prompt = interaction.options.getString("prompt");

  const geminiResponse = await generateGeminiResponse(
    process.env.GEMINI_MODEL,
    prompt
  );

  // TODO: Format response if has more than 2000 characters (send batched messages)
  // For know, just send a message saying it's too long
  if (geminiResponse.length > 2000) {
    await safeReply(interaction, {
      content:
        "The generated response is too long to display here. Please try a shorter prompt.",
    });
    return;
  }
  await safeReply(interaction, geminiResponse);
}
