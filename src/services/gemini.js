import { GoogleGenAI } from "@google/genai";
import { to } from "../lib/to.lib.js";
import { logger } from "../lib/logger.lib.js";

const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_KEY_API,
});

/**
 * Generate a response using Gemini API
 * @param {string} model - Gemini model name
 * @param {string} prompt - The prompt to generate a response for
 * @returns {Promise<string>} - The generated response text
 */
export async function generateGeminiResponse(model, prompt) {
  const [error, response] = await to(
    geminiClient.models.generateContent({
      model: model,
      contents: prompt,
    })
  );
  if (error) {
    logger.error(`Gemini API error: ${error.message}`);
    throw new Error("Failed to generate response from Gemini API");
  }

  return response.candidates[0].content.parts[0].text;
}
