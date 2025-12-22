/**
 * Normalize GitHub repository URL to "owner/repo" format
 */
export function normalizeRepo(repo?: string | null): string | null {
  if (!repo) return null
  const r = repo.trim()
  // Match owner/repo, potentially followed by /tree/branch or other things
  const m = r.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s?#]+)/i)
  if (m && m[1] && m[2]) {
    const owner = m[1]
    const repoPart = m[2]
    // Split by / to get just the repo name if there's more after it
    const repoName = repoPart.split("/")[0]?.replace(/\.git$/i, "")
    if (owner && repoName) {
      return `${owner}/${repoName}`
    }
  }
  // Fallback for owner/repo format
  if (/^[^/\s]+\/[^/\s]+$/.test(r)) return r
  return null
}

/**
 * Extract branch name from GitHub URL if present (e.g., /tree/branch-name)
 */
export function extractBranch(repo?: string | null): string | null {
  if (!repo) return null
  const r = repo.trim()
  const m = r.match(/\/tree\/([^/\s?#]+)/i)
  return (m && m[1]) ? m[1] : null
}
