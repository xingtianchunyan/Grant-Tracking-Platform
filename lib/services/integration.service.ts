import { config } from "@/configs/config"
import { ActivityService } from "./activity.service"
import { normalizeRepo, extractBranch } from "@/lib/github-utils"

export interface GithubCommitSummary {
  sha: string
  message: string | null
  authorName: string | null
  date: string | null
  url: string | null
}

export interface GithubPrSummary {
  number: number
  title: string | null
  state: string
  merged: boolean
  updatedAt: string | null
  mergedAt: string | null
  url: string | null
}

export interface GithubCheck {
  ok: boolean
  reason?: string
  commitActivity?: boolean
  pullActivity?: boolean
  commits?: GithubCommitSummary[]
  prs?: GithubPrSummary[]
}

export class IntegrationService {
  /**
   * Normalize GitHub repository URL to "owner/repo" format
   */
  static normalizeRepo(repo?: string | null): string | null {
    return normalizeRepo(repo)
  }

  /**
   * Extract branch name from GitHub URL if present (e.g., /tree/branch-name)
   */
  static extractBranch(repo?: string | null): string | null {
    return extractBranch(repo)
  }

  /**
   * Check GitHub activity (commits and PRs) for a repository
   */
  static async checkGithubActivity(repo: string, sinceIso: string, branch?: string | null): Promise<GithubCheck> {
    if (!repo || !repo.includes("/")) return { ok: false, reason: "invalid_repo_format" }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "risk-scan",
    }
    
    if (config.githubToken) {
      headers.Authorization = `Bearer ${config.githubToken}`
    } else {
      console.warn(`[IntegrationService] No GITHUB_TOKEN configured. Rate limits will be strict.`)
    }

    const base = `https://api.github.com/repos/${repo}`

    try {
      const sinceDate = new Date(sinceIso)

      // Fetch up to 2 latest commits to sync history
      const commitsUrl = `${base}/commits?per_page=2${branch ? `&sha=${branch}` : ""}`
      const cRes = await fetch(commitsUrl, { headers, cache: "no-store" })
      
      let commitsList: GithubCommitSummary[] = []
      let commitActivity = false
      let cReason = ""

      if (!cRes.ok) {
        const t = await cRes.text().catch(() => "")
        cReason = `commits_check_failed:${cRes.status}:${t}`
        console.error(`[IntegrationService] GitHub Commits Error for ${repo}: ${cRes.status} ${t}`)
      } else {
        const commits = (await cRes.json()) as any[]
        if (Array.isArray(commits)) {
          for (const c of commits) {
             const cMsg = c?.commit?.message ?? null
             const cDateStr: string | null = c?.commit?.author?.date ?? c?.commit?.committer?.date ?? null
             const cAuthor: string | null = c?.commit?.author?.name ?? c?.author?.login ?? c?.commit?.committer?.name ?? null
             
             if (cDateStr) {
               const d = new Date(cDateStr)
               // Check if this specific commit is recent enough for "Activity" status
               if (d >= sinceDate) {
                 commitActivity = true
               }
               
               commitsList.push({
                  sha: c?.sha ?? "",
                  message: cMsg,
                  authorName: cAuthor,
                  date: cDateStr,
                  url: c?.html_url ?? null,
               })
             }
          }
        }
      }

      // Fetch up to 2 recent PRs
      const prsUrl = `${base}/pulls?state=all&sort=updated&direction=desc&per_page=2`
      const pRes = await fetch(prsUrl, { headers, cache: "no-store" })
      
      let prsList: GithubPrSummary[] = []
      let pullActivity = false
      let pReason = ""

      if (!pRes.ok) {
        const t = await pRes.text().catch(() => "")
        pReason = `prs_check_failed:${pRes.status}:${t}`
        console.error(`[IntegrationService] GitHub PRs Error for ${repo}: ${pRes.status} ${t}`)
      } else {
        const pulls = (await pRes.json()) as any[]
        if (Array.isArray(pulls)) {
          for (const pr of pulls) {
              const mergedAt: string | null = pr.merged_at ?? null
              const updatedAt: string | null = pr.updated_at ?? null
              const compareDateStr = mergedAt ?? updatedAt
              
              if (compareDateStr) {
                 const d = new Date(compareDateStr)
                 if (d >= sinceDate) {
                   pullActivity = true
                 }
                 
                 prsList.push({
                    number: pr.number,
                    title: pr.title ?? null,
                    state: pr.state ?? "closed",
                    merged: !!pr.merged_at,
                    updatedAt,
                    mergedAt,
                    url: pr.html_url ?? null,
                 })
              }
          }
        }
      }

      if (cReason && pReason) {
          return { ok: false, reason: `${cReason} | ${pReason}` }
      }

      return {
        ok: true,
        commitActivity,
        pullActivity,
        commits: commitsList,
        prs: prsList,
      }
    } catch (e: any) {
      return { ok: false, reason: `github_error:${e?.message || "unknown"}` }
    }
  }

  /**
    * Sync GitHub activity for a project
    */
   static async syncGithubActivity(projectId: number, repo: string, sinceIso: string): Promise<GithubCheck> {
     const normRepo = this.normalizeRepo(repo)
     if (!normRepo) return { ok: false, reason: "invalid_repo_format" }
 
     const branch = this.extractBranch(repo)
     const res = await this.checkGithubActivity(normRepo, sinceIso, branch)
     if (!res.ok) return res

    // --- SYNC COMMITS ---
    if (res.commits) {
      for (const c of res.commits) {
        if (!c.url) continue
        const already = await ActivityService.activityExists(projectId, "commit", c.url)
        if (!already) {
          await ActivityService.createActivity({
            projectId,
            activity_type: "commit",
            source: "GITHUB",
            title: c.message?.split("\n")[0] || "Commit",
            description: c.message,
            url: c.url,
            author: c.authorName,
            timestamp: c.date,
          })
        }
      }
    }

    // --- SYNC PRS ---
    if (res.prs) {
      for (const pr of res.prs) {
        if (!pr.url) continue
        const activityType = pr.merged ? "merge" : "pull_request"
        const already = await ActivityService.activityExists(projectId, activityType, pr.url)
        if (!already) {
          await ActivityService.createActivity({
            projectId,
            activity_type: activityType,
            source: "GITHUB",
            title: pr.title || `PR #${pr.number}`,
            description: pr.merged ? `PR #${pr.number} merged` : `PR #${pr.number} (${pr.state})`,
            url: pr.url,
            author: null,
            timestamp: pr.mergedAt || pr.updatedAt,
          })
        }
      }
    }

    return res
  }
}
