import { Interaction, REST, Routes } from "discord.js";
import { discordConfig } from "../config";
import * as progressUpdate from "./progress-update";
import * as milestoneStatus from "./milestone-status";
import * as ping from "./ping";
import * as createProject from "./create-project";

const commands = {
  [progressUpdate.data.name]: progressUpdate,
  [milestoneStatus.data.name]: milestoneStatus,
  [ping.data.name]: ping,
  [createProject.data.name]: createProject,
};

export async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(discordConfig.token!);
  const body = Object.values(commands).map((c) => c.data.toJSON());

  try {
    await rest.put(
      Routes.applicationGuildCommands(discordConfig.appId!, discordConfig.guildId!),
      { body }
    );
    console.log("✅ Slash commands registered for guild.");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
    throw error;
  }
}

export async function handleInteraction(interaction: Interaction) {
  // Log receipt
  if (interaction.isCommand()) {
     console.log(`[DISCORD] Interaction received: ${interaction.id} - ${interaction.commandName} - User: ${interaction.user.tag}`);
  }

  try {
    if (interaction.isChatInputCommand()) {
      const command = commands[interaction.commandName];
      if (command) {
        await command.execute(interaction);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      // Dispatch based on customId prefix or known IDs
      if (interaction.customId === "pick_project_for_progress") {
        await progressUpdate.handleSelectMenu(interaction);
      } else if (interaction.customId === "pick_project_for_milestone" || interaction.customId.startsWith("set_status:")) {
        await milestoneStatus.handleSelectMenu(interaction);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("progress_modal:")) {
        await progressUpdate.handleModal(interaction);
      }
      return;
    }
  } catch (err: any) {
    const clean = typeof err?.message === "string" ? err.message : "Something went wrong";
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `❌ Error: ${clean}` }).catch(() => {});
      } else {
        await interaction.reply({ ephemeral: true, content: `❌ Error: ${clean}` }).catch(() => {});
      }
    } else {
      console.error("Unhandled interaction error:", err);
    }
  }
}
