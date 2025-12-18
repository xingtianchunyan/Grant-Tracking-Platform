import { config as appConfig } from "@/configs/config";

export const discordConfig = {
  token: appConfig.discordBotToken,
  appId: appConfig.discordAppId,
  guildId: appConfig.guildId,
  serviceBotToken: appConfig.serviceBotToken,
  backendUrl: appConfig.backendUrl,
};

export function validateDiscordConfig() {
  if (!discordConfig.token || !discordConfig.appId || !discordConfig.guildId) {
    throw new Error(
      "Missing one of DISCORD_BOT_TOKEN_COMMANDER, DISCORD_APP_ID_COMMANDER, DISCORD_GUILD_ID"
    );
  }
  if (!discordConfig.serviceBotToken) {
    throw new Error("Missing SERVICE_BOT_TOKEN");
  }
}
