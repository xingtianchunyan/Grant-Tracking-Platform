import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  Message,
  TextBasedChannel
} from "discord.js";
import { discordConfig } from "../config";
import { postJson } from "../utils";

export const data = new SlashCommandBuilder()
  .setName("create")
  .setDescription("Create resources")
  .addSubcommand(subcommand =>
    subcommand
      .setName("project-and-milestone")
      .setDescription("Create a project and milestone from a Discord message")
      .addStringOption(option =>
        option.setName("message_link")
          .setDescription("Link to the Discord message containing project details")
          .setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const messageLink = interaction.options.getString("message_link", true);
    
    // Parse message link: https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID
    const match = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
    
    if (!match) {
      await interaction.editReply({ 
        content: "❌ Invalid Discord message link format. Please check the link and try again." 
      });
      return;
    }

    const [, guildId, channelId, messageId] = match;

    if (!channelId || !messageId) {
         await interaction.editReply({ 
            content: "❌ Could not parse channel or message ID from the link." 
        });
        return;
    }
    
    const channel = await interaction.client.channels.fetch(channelId) as TextBasedChannel;
    
    if (!channel || !channel.isTextBased()) {
       await interaction.editReply({ 
        content: "❌ Could not access the channel. Please ensure the bot has permission to view it." 
      });
      return;
    }

    let targetMessage: Message;
    try {
        targetMessage = await channel.messages.fetch(messageId);
    } catch (e) {
        await interaction.editReply({ 
            content: "❌ Could not fetch the message. It might be deleted or I don't have permission to read it." 
        });
        return;
    }

    const content = targetMessage.content;
    if (!content && targetMessage.embeds.length === 0) {
        await interaction.editReply({ 
            content: "❌ The linked message has no text content to parse." 
        });
        return;
    }

    // Prepare full content including embeds
    let fullContent = content;
    if (targetMessage.embeds.length > 0) {
        fullContent += "\n\n[Embeds Content]:\n" + targetMessage.embeds.map(e => 
            `Title: ${e.title}\nDesc: ${e.description}\nFields: ${e.fields.map(f => `${f.name}: ${f.value}`).join(', ')}`
        ).join("\n---\n");
    }

    // 1. Post to backend temp storage
    let tempId: string;
    try {
        const res = await postJson(
            `${discordConfig.backendUrl}/api/discord/temp-message`,
            { 
                content: fullContent,
                metadata: {
                    author: targetMessage.author.tag,
                    link: messageLink,
                    timestamp: targetMessage.createdAt
                }
            },
            { Authorization: `Bearer ${discordConfig.serviceBotToken}` }
        );
        tempId = (res as any).id;
    } catch (e: any) {
        console.error("Failed to save temp message:", e);
        await interaction.editReply({ content: `❌ Backend Error: ${e.message}` });
        return;
    }

    // 2. Generate URL with tempId
    const createUrl = `${discordConfig.backendUrl}/admin/projects/new?tempId=${tempId}`;
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel("Open Creation Page")
          .setStyle(ButtonStyle.Link)
          .setURL(createUrl)
      );

    await interaction.editReply({
      content: "✅ **Ready to create!**\nI've analyzed the message and prepared the form. Click below to continue.",
      components: [row]
    });

  } catch (error: any) {
    console.error("[create-project] Error:", error);
    await interaction.editReply({ content: `❌ Error: ${error.message}` }).catch(() => {});
  }
}
