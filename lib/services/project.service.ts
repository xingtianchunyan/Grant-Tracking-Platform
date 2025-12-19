import { sql } from "@/lib/db"
import type { Project } from "@/lib/types"
import { parseDurationToEndDate } from "@/lib/utils"
import { config } from "@/configs/config"
import { validateStringLength, validateEmail } from "@/lib/api-helpers"

/**
 * Service to handle Project-related business logic.
 */
export class ProjectService {
  
  /**
   * Retrieves all projects with their milestone statistics.
   */
  async getAllProjects() {
    const projects = await sql`
      SELECT 
        p.*,
        COUNT(m.id) as total_milestones,
        COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as completed_milestones,
        CASE 
          WHEN COUNT(m.id) = 0 THEN 0
          ELSE ROUND((COUNT(CASE WHEN m.status = 'completed' THEN 1 END)::numeric / COUNT(m.id)::numeric) * 100, 2)
        END as progress_percentage,
        (
          SELECT status 
          FROM milestones 
          WHERE project_id = p.id 
            AND status != 'completed'
          ORDER BY created_at DESC 
          LIMIT 1
        ) as active_milestone_status
      FROM projects p
      LEFT JOIN milestones m ON p.id = m.project_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `
    return projects
  }

  /**
   * Creates a new project and attempts to resolve the Discord User ID.
   */
  async createProject(data: any) {
    const {
      name,
      description,
      status,
      github_repo,
      proposal_link,
      discord_channel,
      funding_amount,
      start_date,
      end_date,
      creator_username,
      grantee_email,
      category,
      program_type,
      mission_expertise,
      campaign_goals,
      creator_stat_1_name,
      creator_stat_1_number,
      creator_stat_2_name,
      creator_stat_2_number,
      youtube_link,
      tiktok_link,
      twitter_link,
      twitch_link,
      website_links,
      duration,
    } = data

    // Validation
    validateStringLength(name, "name", 255)
    validateStringLength(github_repo, "github_repo", 255)
    validateStringLength(discord_channel, "discord_channel", 255)
    validateStringLength(creator_username, "creator_username", 255)
    validateEmail(grantee_email, "grantee_email")
    validateStringLength(creator_stat_1_name, "creator_stat_1_name", 255)
    validateStringLength(creator_stat_2_name, "creator_stat_2_name", 255)
    validateStringLength(category, "category", 100)
    validateStringLength(program_type, "program_type", 100)
    validateStringLength(duration, "duration", 100)
    validateStringLength(youtube_link, "youtube_link", 500)
    validateStringLength(tiktok_link, "tiktok_link", 500)
    validateStringLength(twitter_link, "twitter_link", 500)
    validateStringLength(twitch_link, "twitch_link", 500)

    // Coercion
    const safeName = name ? name.substring(0, 255) : null
    const safeGithubRepo = github_repo ? github_repo.substring(0, 255) : null
    const safeDiscordChannel = discord_channel ? discord_channel.substring(0, 255) : null
    const safeCreatorUsername = creator_username ? creator_username.substring(0, 255) : null
    const safeGranteeEmail = grantee_email ? grantee_email.substring(0, 255) : null
    const safeCreatorStat1Name = creator_stat_1_name ? creator_stat_1_name.substring(0, 255) : null
    const safeCreatorStat2Name = creator_stat_2_name ? creator_stat_2_name.substring(0, 255) : null
    const safeCategory = category ? category.substring(0, 100) : null
    const safeProgramType = program_type ? program_type.substring(0, 100) : null
    const safeDuration = duration ? duration.substring(0, 100) : null

    const parseSafeInt = (val: any) => {
      if (val === null || val === undefined || val === "") return null;
      const parsed = Number.parseInt(val);
      return isNaN(parsed) ? null : Math.min(Math.max(parsed, -2147483648), 2147483647);
    };

    const safeCreatorStat1 = parseSafeInt(creator_stat_1_number);
    const safeCreatorStat2 = parseSafeInt(creator_stat_2_number);

    const safeFundingAmount = (funding_amount !== null && funding_amount !== undefined && funding_amount !== "") 
      ? Number.parseFloat(funding_amount) 
      : null;
    
    const finalFundingAmount = isNaN(safeFundingAmount as number) ? null : safeFundingAmount;

    // Date Logic
    let calculatedEndDate = end_date
    if (!end_date && safeDuration && start_date) {
      const parsedEndDate = parseDurationToEndDate(start_date, safeDuration)
      if (parsedEndDate) calculatedEndDate = parsedEndDate.toISOString().split("T")[0]
    }

    // DB Insert
    console.log(`[ProjectService] Inserting project: ${safeName}`);
    const [project] = (await sql`
      INSERT INTO projects (
        name, description, status, github_repo, proposal_link, discord_channel,
        funding_amount, start_date, end_date,
        creator_username, grantee_email, category, program_type,
        project_background, mission_expertise, campaign_goals,
        creator_stat_1_name, creator_stat_1_number, creator_stat_2_name, creator_stat_2_number,
        youtube_link, tiktok_link, twitter_link, twitch_link,
        website_links, duration
      )
      VALUES (
        ${safeName},
        ${description},
        ${status || "active"},
        ${safeGithubRepo},
        ${proposal_link},
        ${safeDiscordChannel},
        ${finalFundingAmount},
        ${start_date},
        ${calculatedEndDate},
        ${safeCreatorUsername},
        ${safeGranteeEmail},
        ${safeCategory},
        ${safeProgramType},
        ${description},
        ${mission_expertise},
        ${campaign_goals},
        ${safeCreatorStat1Name},
        ${safeCreatorStat1},
        ${safeCreatorStat2Name},
        ${safeCreatorStat2},
        ${youtube_link},
        ${tiktok_link},
        ${twitter_link},
        ${twitch_link},
        ${website_links},
        ${safeDuration}
      )
      RETURNING *
    `) as Project[]

    console.log(`[ProjectService] Project inserted successfully: ${project?.id}`);

    // Post-creation hooks (Discord resolution)
    if (project?.creator_username) {
      // Fire and forget or handle asynchronously to avoid blocking the main response
      this.resolveAndAssignDiscordUser(project.id, project.creator_username).catch(err => {
        console.error(`[ProjectService] Discord resolution failed for project ${project.id}:`, err);
      });
    }

    return project
  }

  /**
   * Internal method to resolve Discord ID and update project asynchronously.
   */
  private async resolveAndAssignDiscordUser(projectId: number, username: string) {
    const userId = await this.resolveDiscordUserIdFromUsername(username)
    if (userId) {
      await sql`
        UPDATE projects
        SET assignee_discord_id = ${userId}, updated_at = NOW()
        WHERE id = ${projectId}
      `
      console.log(`[ProjectService] Discord ID ${userId} assigned to project ${projectId}`);
    }
  }

  /**
   * Helper to lookup Discord user ID.
   * Kept private or internal to the service.
   */
  private async resolveDiscordUserIdFromUsername(username?: string) {
    if (!username || !config.discordBotToken || !config.guildId) return null
    try {
      const q = encodeURIComponent(username.trim())
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const resp = await fetch(`https://discord.com/api/v10/guilds/${config.guildId}/members/search?query=${q}&limit=5`, {
        headers: { Authorization: `Bot ${config.discordBotToken}` },
        cache: "no-store",
        signal: controller.signal
      })
      
      clearTimeout(timeoutId);

      if (!resp.ok) {
        console.warn(`[ProjectService] Discord API returned ${resp.status} for username ${username}`);
        return null
      }
      const members = (await resp.json()) as Array<{
        user: { id: string; username?: string; global_name?: string }
        nick?: string
      }>
      if (!Array.isArray(members) || members.length === 0) return null

      const lc = username.toLowerCase()
      const match =
        members.find(
          (m) =>
            (m.user?.username && m.user.username.toLowerCase() === lc) ||
            (m.user?.global_name && m.user.global_name.toLowerCase() === lc) ||
            (m.nick && m.nick.toLowerCase() === lc),
        ) || members[0]

      return match?.user?.id ?? null
    } catch (e) {
      return null
    }
  }
}

export const projectService = new ProjectService()
