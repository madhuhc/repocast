import { sleep } from "./utils";
import type { RepoMeta, TreeEntry, IssueEntry, PREntry } from "@/types";

const GITHUB_API = "https://api.github.com";
const MAX_RETRIES = 4;
const BACKOFF_BASE_MS = 1000;
const RATE_LIMIT_THRESHOLD = 10;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "repocast/0.1.0",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleRateLimit(response: Response): Promise<void> {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const resetAt = response.headers.get("X-RateLimit-Reset");
  if (remaining && parseInt(remaining, 10) < RATE_LIMIT_THRESHOLD && resetAt) {
    const resetMs = parseInt(resetAt, 10) * 1000;
    const waitMs = Math.max(0, resetMs - Date.now()) + 1000;
    console.log(
      `[github] Rate limit low (${remaining} remaining). Waiting ${Math.round(waitMs / 1000)}s...`
    );
    await sleep(waitMs);
  }
}

async function githubFetch(path: string, params?: Record<string, string>): Promise<Response> {
  const url = new URL(`${GITHUB_API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url.toString(), { headers: getHeaders() });

    if (response.ok) {
      await handleRateLimit(response);
      return response;
    }

    if (response.status === 404) {
      throw new GitHubError("Repository not found. Check that it's public and the URL is correct.", 404);
    }

    if (response.status === 429 || response.status === 403) {
      if (attempt === MAX_RETRIES) {
        throw new GitHubError(
          "GitHub API rate limit reached. Add a GITHUB_TOKEN to your .env to get 80x more requests.",
          response.status
        );
      }
      const backoffMs = BACKOFF_BASE_MS * Math.pow(2, attempt);
      console.log(`[github] ${response.status} — retrying in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(backoffMs);
      continue;
    }

    throw new GitHubError(`GitHub API error: ${response.status} ${response.statusText}`, response.status);
  }

  throw new GitHubError("GitHub API request failed after retries", 500);
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export async function getRepoMeta(owner: string, repo: string): Promise<RepoMeta> {
  const response = await githubFetch(`/repos/${owner}/${repo}`);
  const data = await response.json();
  return {
    owner,
    repo,
    description: data.description ?? null,
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    primaryLanguage: data.language ?? null,
    topics: data.topics ?? [],
    defaultBranch: data.default_branch ?? "main",
    license: data.license?.spdx_id ?? null,
    lastPushed: data.pushed_at ?? new Date().toISOString(),
    openIssuesCount: data.open_issues_count ?? 0,
  };
}

export async function getFileTree(
  owner: string,
  repo: string,
  branch: string
): Promise<TreeEntry[]> {
  const response = await githubFetch(`/repos/${owner}/${repo}/git/trees/${branch}`, {
    recursive: "1",
  });
  const data = await response.json();
  if (!data.tree) {
    throw new GitHubError("Could not read repository file tree", 500);
  }
  return (data.tree as Array<Record<string, unknown>>).map((item) => ({
    path: item.path as string,
    type: item.type as "blob" | "tree",
    sha: item.sha as string,
    size: item.size as number | undefined,
  }));
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const response = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, {
    per_page: "1",
  });
  const data = await response.json();
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content as string, "base64").toString("utf-8");
  }
  if (typeof data.content === "string") {
    return data.content;
  }
  throw new GitHubError(`Could not read file content for ${path}`, 500);
}

export async function getRepoIssues(
  owner: string,
  repo: string,
  limit: number = 10
): Promise<IssueEntry[]> {
  const response = await githubFetch(`/repos/${owner}/${repo}/issues`, {
    state: "open",
    sort: "created",
    direction: "desc",
    per_page: String(limit),
  });
  const data = (await response.json()) as Array<Record<string, unknown>>;
  return data
    .filter((item) => !item.pull_request)
    .map((item) => ({
      number: item.number as number,
      title: item.title as string,
      state: item.state as string,
      createdAt: item.created_at as string,
      labels: ((item.labels as Array<Record<string, unknown>>) ?? []).map(
        (l) => (l.name ?? "") as string
      ),
    }));
}

export async function getTopPRs(
  owner: string,
  repo: string,
  limit: number = 5
): Promise<PREntry[]> {
  const response = await githubFetch(`/repos/${owner}/${repo}/pulls`, {
    state: "all",
    sort: "created",
    direction: "desc",
    per_page: String(limit),
  });
  const data = (await response.json()) as Array<Record<string, unknown>>;
  return data.map((item) => ({
    number: item.number as number,
    title: item.title as string,
    state: item.state as string,
    createdAt: item.created_at as string,
    mergedAt: (item.merged_at ?? null) as string | null,
  }));
}
