import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Health check: Pong!");

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.reply({ content: "Pong! 🏓", ephemeral: true });
  } catch (error) {
    console.error("Failed to send pong:", error);
  }
}
