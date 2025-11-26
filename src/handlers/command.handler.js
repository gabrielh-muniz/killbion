import { logger } from "../lib/logger.lib.js";
import { Collection } from "discord.js";
import { readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { registerAppCommands } from "../utils/rest-client.utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {import("discord.js").Client & {commands: Collection<string, any>}} ExtendedClient
 */

/**
 * Loads commands from the commands directory and registers them with the Discord client
 * @param {ExtendedClient} client - The Discord client instance
 * @returns {Promise<void>} - A promise that resolves when all commands are loaded
 */
export async function loadCommands(client) {
  // Initialize the commands collection
  client.commands = new Collection();

  // Path to commands directory
  const commandsPath = join(__dirname, "../commands");

  // Read all command files
  const commandFiles = readdirSync(commandsPath).filter((file) =>
    file.endsWith(".js")
  );

  // Loop through each command file and register it
  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(filePath);

    // Ensure the command has the required properties
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warn(
        `The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}
