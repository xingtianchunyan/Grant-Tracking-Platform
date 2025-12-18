import "global-agent/bootstrap"; // Initialize global proxy agent
import "@/lib/proxy"; // Initialize undici proxy
import { Client, GatewayIntentBits } from "discord.js";

export function createDiscordClient() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  client.once("ready", () => {
    console.log(`🤖 Logged in as ${client.user?.tag}`);
  });

  return client;
}
