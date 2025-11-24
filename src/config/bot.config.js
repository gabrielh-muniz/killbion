import {
  ActivityType,
  IntentsBitField,
  Partials,
  PresenceUpdateStatus,
} from "discord.js";

export const botConfig = {
  config: {
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.MessageContent,
      IntentsBitField.Flags.GuildMessageReactions,
    ],
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.Message,
      Partials.Reaction,
      Partials.User,
    ],
  },
  activity: {
    status: process.env.BOT_STATUS || PresenceUpdateStatus.Online,
    activities: [
      {
        name: process.env.BOT_ACTIVITY_NAME || "for commands",
        type: process.env.BOT_ACTIVITY_TYPE || ActivityType.Playing,
      },
    ],
  },
};
