import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  StringSelectMenuInteraction, 
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder
} from "discord.js";
import { discordConfig } from "../config";
import { getJson, patchJson, safeChannelSend, buildProjectSelect, AssignedProject } from "../utils";

export const data = new SlashCommandBuilder()
  .setName("milestone-status")
  .setDescription("Update the status of a milestone");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const discordId = interaction.user.id;

  try {
    const projects = await getJson<AssignedProject[]>(
        `${discordConfig.backendUrl}/api/discord/assigned-projects?discord_id=${encodeURIComponent(discordId)}`
    );

    if (!projects.length) {
      await interaction.editReply({
        content: "No projects are assigned to you yet.",
      });
      return;
    }

    const row = buildProjectSelect("pick_project_for_milestone", projects, "Select a project");
    await interaction.editReply({
      content: "Choose the project whose active milestone you want to update:",
      components: [row],
    });
  } catch (error: any) {
    await interaction.editReply({ content: `❌ Error: ${error.message}` });
  }
}

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  // 1. Pick Project
  if (interaction.customId === "pick_project_for_milestone") {
    const projectId = interaction.values?.[0];
    if (!projectId) {
      await interaction.reply({ ephemeral: true, content: "❌ No project selected." }).catch(() => {});
      return;
    }

    const label =
      (interaction.component as any)?.options?.find((o: any) => o?.data?.value === projectId)?.data?.label ||
      "Project";

    const statusRow = buildStatusSelect(`set_status:${projectId}:${encodeURIComponent(label)}`);
    await interaction.update({
      content:
        "Pick a status to apply to the **active milestone**.\n" +
        "_Note: you can only actually **apply** `completed`. Choosing anything else will just inform you._",
      components: [statusRow],
    });
    return;
  }

  // 2. Pick Status
  if (interaction.customId.startsWith("set_status:")) {
    const userId = interaction.user.id;
    const parts = interaction.customId.split(":");
    const projectId = parts[1]; 
    const projectName = decodeURIComponent(parts[2] || "Project");
    
    if (!projectId) {
      await interaction.reply({ ephemeral: true, content: "❌ Missing project id." }).catch(() => {});
      return;
    }
    const chosen = interaction.values[0];

    if (chosen !== "completed") {
      await interaction.update({
        content:
          `You picked \`${chosen}\`. Via Discord you can only mark the active milestone as \`completed\`. ` +
          `No changes were made.`,
        components: [],
      });
      await safeChannelSend(
        interaction,
        `ℹ️ **${projectName}** — user <@${userId}> selected status \`${chosen}\` (no change applied).`
      );
      return;
    }

    // Apply "completed"
    await interaction.update({ content: "Updating milestone…", components: [] });

    try {
        await patchJson(
            `${discordConfig.backendUrl}/api/projects/${projectId}/milestones`,
            { status: "completed", callerDiscordId: userId },
            { Authorization: `Bearer ${discordConfig.serviceBotToken}` }
        );

        await safeChannelSend(
            interaction,
            `🎯 **${projectName}** — active milestone **marked completed** by <@${userId}>`
        );

        await interaction.followUp({
            ephemeral: true,
            content: `Done. Active milestone marked **completed** for **${projectName}**.`,
        }).catch(() => {});
    } catch (error: any) {
        await interaction.followUp({ ephemeral: true, content: `❌ Error: ${error.message}` }).catch(() => {});
    }
  }
}

const ALL_STATUSES = ["completed"];

function buildStatusSelect(customId: string) {
  const options = ALL_STATUSES.map((s) =>
    new StringSelectMenuOptionBuilder().setLabel(s).setValue(s)
  );
  const select = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Pick a status")
    .addOptions(options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}
