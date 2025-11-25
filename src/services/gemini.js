import { GoogleGenAI } from "@google/genai";
import { to } from "../lib/to.lib.js";
import { logger } from "../lib/logger.lib.js";

const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_KEY_API,
});

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
  // console.log(
  //   "Gemini API response:",
  //   response.candidates[0].content.parts[0].text
  // );
  return response.candidates[0].content.parts[0].text;
}

// test
// generateGeminiResponse(
//   process.env.GEMINI_MODEL,
//   "Explain the E=mc^2 equation in simple terms for a 5-year-old."
// )
//   .then((response) => {
//     logger.info("Gemini Response:", response);
//   })
//   .catch((error) => {
//     logger.error("Error generating Gemini response:", error);
//   });
