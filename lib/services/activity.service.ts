import { sql } from "@/lib/db"

export interface ActivityLog {
  id: number
  project_id: number
  project_name?: string
  activity_type: string
  source: string
  title: string
  description: string | null
  url: string | null
  author: string | null
  timestamp: string | Date
  link?: string
}

export interface CreateActivityInput {
  projectId: number
  activity_type: string
  source: string
  title: string | null
  description: string | null
  url: string | null
  author: string | null
  timestamp?: string | Date | null
  metadata?: any
}

export class ActivityService {
  /**
   * Get activity logs for a specific project
   */
  static async getProjectActivities(projectId: number, limit = 50): Promise<ActivityLog[]> {
    const rows = await sql/*sql*/`
      SELECT
        al.id,
        al.project_id,
        p.name AS project_name,
        al.activity_type,
        al.source,
        al.title,
        al.description,
        al.url,
        al.author,
        al.timestamp
      FROM activity_logs al
      JOIN projects p ON p.id = al.project_id
      WHERE al.project_id = ${projectId}
      ORDER BY al.timestamp DESC
      LIMIT ${limit}
    `
    return this.normalizeLogs(rows)
  }

  /**
   * Get recent activity logs across all projects
   */
  static async getRecentActivities(limit = 50): Promise<ActivityLog[]> {
    const rows = await sql/*sql*/`
      SELECT
        al.id,
        al.project_id,
        p.name AS project_name,
        al.activity_type,
        al.source,
        al.title,
        al.description,
        al.url,
        al.author,
        al.timestamp
      FROM activity_logs al
      JOIN projects p ON p.id = al.project_id
      ORDER BY al.timestamp DESC
      LIMIT ${limit}
    `
    return this.normalizeLogs(rows)
  }

  /**
   * Create a new activity log entry
   */
  static async createActivity(data: CreateActivityInput): Promise<ActivityLog> {
    const { 
      projectId, 
      activity_type, 
      source, 
      title, 
      description, 
      url, 
      author, 
      timestamp,
      metadata = {} 
    } = data

    const ts = timestamp ? new Date(timestamp) : new Date()

    const [row] = await sql/*sql*/`
      INSERT INTO activity_logs
        (project_id, activity_type, source, title, description, url, author, timestamp, metadata)
      VALUES
        (${projectId}, ${activity_type}, ${source}, ${title}, ${description}, ${url}, ${author}, ${ts}, ${metadata})
      RETURNING id, project_id, activity_type, source, title, description, url, author, timestamp
    `

    // Touch project's last_activity_at
    await sql/*sql*/`
      UPDATE projects
      SET last_activity_at = now(), updated_at = now()
      WHERE id = ${projectId}
    `

    if (!row) {
      throw new Error("Failed to create activity log: No data returned")
    }

    return this.normalizeLogs([row])[0]!
  }

  /**
   * Check if an activity already exists (to prevent duplicates)
   */
  static async activityExists(projectId: number, activityType: string, url: string | null): Promise<boolean> {
    if (!url) return false
    const rows = await sql/*sql*/`
      SELECT 1
      FROM activity_logs
      WHERE project_id = ${projectId}
        AND activity_type = ${activityType}
        AND url = ${url}
      LIMIT 1
    `
    return rows.length > 0
  }

  /**
   * Get count of Discord activities since a specific date
   */
  static async getDiscordActivityCount(projectId: number, sinceIso: string): Promise<number> {
    const rows = await sql/*sql*/`
      SELECT COUNT(*)::int AS cnt
      FROM activity_logs
      WHERE project_id = ${projectId}
        AND source = 'discord'
        AND "timestamp" >= ${sinceIso}
    `
    return (rows?.[0]?.cnt ?? 0) as number
  }

  /**
   * Normalize database rows into ActivityLog objects
   */
  private static normalizeLogs(rows: any[]): ActivityLog[] {
    return rows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      project_name: r.project_name,
      activity_type: r.activity_type,
      source: r.source,
      title: r.title,
      description: r.description,
      url: r.url,
      author: r.author,
      timestamp: r.timestamp,
      link: r.url && typeof r.url === "string" && r.url.trim()
        ? r.url
        : `/admin/projects/${r.project_id}`,
    }))
  }
}
