import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  StringSelectMenuInteraction, 
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";
import { discordConfig } from "../config";
import { getJson, postJson, safeChannelSend, buildProjectSelect, AssignedProject } from "../utils";

export const data = new SlashCommandBuilder()
  .setName("progress-update")
  .setDescription("Post a progress update for your project");

export async function execute(interaction: ChatInputCommandInteraction) {
  // 1. Immediate Deferral
  try {
    await interaction.deferReply({ ephemeral: true });
    console.log(`[DISCORD] /progress-update deferred successfully for user ${interaction.user.id}`);
  } catch (deferError: any) {
    console.error("[DISCORD] Failed to defer reply:", deferError);
    // If we can't defer, we can't reply. It's likely a network issue.
    return;
  }

  const discordId = interaction.user.id;
  
  try {
    // 2. Fetch Assigned Projects
    console.log(`[DISCORD] Fetching projects for ${discordId}...`);
    const projects = await getJson<AssignedProject[]>(
        `${discordConfig.backendUrl}/api/discord/assigned-projects?discord_id=${encodeURIComponent(discordId)}`
    );
    console.log(`[DISCORD] Fetched ${projects.length} projects for ${discordId}`);

    if (!projects.length) {
      await interaction.editReply({
        content: "No projects are assigned to you yet.",
      });
      return;
    }

    // 3. Present Selection
    const row = buildProjectSelect("pick_project_for_progress", projects, "Select a project");
    await interaction.editReply({
      content: "Choose the project you want to post a recent update for:",
      components: [row],
    });
  } catch (error: any) {
    console.error("[DISCORD] Error in /progress-update execution:", error);
    await interaction.editReply({ content: `❌ Error: ${error.message}` }).catch(() => {});
  }
}

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  if (interaction.customId === "pick_project_for_progress") {
    const projectId = interaction.values?.[0];
    if (!projectId) {
      await interaction.reply({ ephemeral: true, content: "❌ No project selected." }).catch(() => {});
      return;
    }

    // TS-friendly label read
    const label =
      (interaction.component as any)?.options?.find((o: any) => o?.data?.value === projectId)?.data?.label ||
      "Project";

    const modal = buildProgressModal(projectId, label);
    await interaction.showModal(modal);
  }
}

export async function handleModal(interaction: ModalSubmitInteraction) {
  if (interaction.customId.startsWith("progress_modal:")) {
    const userId = interaction.user.id;
    const parts = interaction.customId.split(":");
    const projectId = parts[1];
    const projectName = decodeURIComponent(parts[2] || "Project");
    
    if (!projectId) {
      await interaction.reply({ ephemeral: true, content: "❌ Missing project id." }).catch(() => {});
      return;
    }

    const title = interaction.fields.getTextInputValue("title_input");
    const description = interaction.fields.getTextInputValue("desc_input") || "";

    // 1. Defer Reply for Modal Submission
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (error) {
        console.error("[DISCORD] Failed to defer modal reply:", error);
        return;
    }

    try {
      await postJson(
        `${discordConfig.backendUrl}/api/projects/${projectId}/progress`,
        { title, description, callerDiscordId: userId },
        { Authorization: `Bearer ${discordConfig.serviceBotToken}` }
      );

      await safeChannelSend(
        interaction,
        [
          `📝 **${projectName}** — recent update from <@${userId}>`,
          `**Title:** ${title}`,
          description ? `**Description:** ${description}` : `**Description:** _none_`,
        ].join("\n")
      );

      await interaction.editReply(`✅ Posted a recent update to **${projectName}**.`).catch(() => {});
    } catch (error: any) {
      console.error("[DISCORD] Error processing modal submission:", error);
      await interaction.editReply({ content: `❌ Error: ${error.message}` }).catch(() => {});
    }
  }
}

function buildProgressModal(projectId: string, projectName: string) {
  const modal = new ModalBuilder()
    .setCustomId(`progress_modal:${projectId}:${encodeURIComponent(projectName)}`)
    .setTitle("Post a recent update");

  const tiTitle = new TextInputBuilder()
    .setCustomId("title_input")
    .setLabel("Title")
    .setStyle(TextInputStyle.Short)
    .setMinLength(3)
    .setMaxLength(120)
    .setRequired(true);

  const tiDesc = new TextInputBuilder()
    .setCustomId("desc_input")
    .setLabel("Description (optional)")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(2000);

  const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(tiTitle);
  const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(tiDesc);

  modal.addComponents(row1, row2);
  return modal;
}
