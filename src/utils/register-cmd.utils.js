import { logger } from "../lib/logger.lib.js";
import { readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { registerAppCommands } from "./rest-client.utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @type {Array<any>}
 */
export const commands = [];

export async function cmd() {
  // Path to the commands directory
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
      commands.push(command.data.toJSON());
    } else {
      logger.warn(
        `The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }

  // Register the commands with Discord API
  await registerAppCommands(
    process.env.BOT_CLIENT_ID,
    process.env.BOT_TOKEN,
    commands
  );
}
