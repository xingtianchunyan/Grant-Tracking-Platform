import { validateDiscordConfig, discordConfig } from "@/lib/discord/config";
import { createDiscordClient } from "@/lib/discord/client";
import { registerCommands, handleInteraction } from "@/lib/discord/commands";

// 1. Validate Config
try {
  validateDiscordConfig();
} catch (error: any) {
  console.error("❌ Configuration Error:", error.message);
  process.exit(1);
}

// 2. Create Client
const client = createDiscordClient();

// 3. Register Interaction Handler
client.on("interactionCreate", handleInteraction);

// 4. Start Bot with Retry Logic
async function startBot() {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`[DISCORD] Attempting to connect (try ${retries + 1}/${maxRetries})...`);
      
      // Register commands before login
      await registerCommands();
      
      await client.login(discordConfig.token);
      console.log("[DISCORD] Successfully connected!");
      return;
    } catch (error: any) {
      retries++;
      console.error(`[DISCORD] Connection failed: ${error?.message || error}`);
      if (retries >= maxRetries) {
        console.error("[DISCORD] Max retries reached. Exiting.");
        process.exit(1);
      }
      // Wait 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

startBot().catch((err) => {
  console.error("[DISCORD] Fatal error during startup:", err);
  process.exit(1);
});
