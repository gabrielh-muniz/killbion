import { REST, Routes } from "discord.js";
import { logger } from "../lib/logger.lib.js";

/**
 * Registers application commands with the Discord API.
 * @param {string} clientId
 * @param {string} token
 * @param {Array<any>} commands
 * @return {Promise<void>}
 */
export async function registerAppCommands(clientId, token, commands) {
  // Creates a new REST client instance
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    logger.info("Registering application commands");

    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    logger.info("Successfully registered application commands");
  } catch (error) {
    logger.error("Error registering application commands:", error);
  }
}
