import type { GeneratedFile } from "./types.js";

export interface PROptions {
  title: string;
  body: string;
  base: string;
  head: string;
  labels?: string[];
}

export interface PullRequest {
  number: number;
  url: string;
  title: string;
}

export interface Pipeline {
  createBranch(name: string): Promise<void>;
  commit(files: GeneratedFile[], message: string): Promise<string>;
  createPullRequest(options: PROptions): Promise<PullRequest>;
  triggerWorkflow(name: string, inputs?: Record<string, string>): Promise<void>;
}

export interface GitHubPipelineConfig {
  token: string;
  owner: string;
  repo: string;
  defaultBranch?: string;
}

export class GitHubPipeline implements Pipeline {
  private readonly token: string;
  private readonly owner: string;
  private readonly repo: string;
  private readonly defaultBranch: string;
  private readonly baseUrl = "https://api.github.com";

  constructor(config: GitHubPipelineConfig) {
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    this.defaultBranch = config.defaultBranch ?? "main";
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async createBranch(name: string): Promise<void> {
    const refResponse = await this.request<{ object: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${this.defaultBranch}`
    );

    await this.request(`/repos/${this.owner}/${this.repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${name}`,
        sha: refResponse.object.sha,
      }),
    });
  }

  async commit(files: GeneratedFile[], message: string): Promise<string> {
    const headRef = await this.request<{ object: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/ref/heads/${this.defaultBranch}`
    );
    const commitSha = headRef.object.sha;

    const baseCommit = await this.request<{ tree: { sha: string } }>(
      `/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`
    );
    const baseTreeSha = baseCommit.tree.sha;

    const treeItems = files.map((file) => ({
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: file.content,
    }));

    const newTree = await this.request<{ sha: string }>(
      `/repos/${this.owner}/${this.repo}/git/trees`,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeItems,
        }),
      }
    );

    const newCommit = await this.request<{ sha: string }>(
      `/repos/${this.owner}/${this.repo}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message,
          tree: newTree.sha,
          parents: [commitSha],
        }),
      }
    );

    return newCommit.sha;
  }

  async createPullRequest(options: PROptions): Promise<PullRequest> {
    const response = await this.request<{
      number: number;
      html_url: string;
      title: string;
    }>(`/repos/${this.owner}/${this.repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
      }),
    });

    if (options.labels && options.labels.length > 0) {
      await this.request(
        `/repos/${this.owner}/${this.repo}/issues/${response.number}/labels`,
        {
          method: "POST",
          body: JSON.stringify({ labels: options.labels }),
        }
      );
    }

    return {
      number: response.number,
      url: response.html_url,
      title: response.title,
    };
  }

  async triggerWorkflow(
    name: string,
    inputs?: Record<string, string>
  ): Promise<void> {
    await this.request(
      `/repos/${this.owner}/${this.repo}/actions/workflows/${name}/dispatches`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: this.defaultBranch,
          inputs: inputs ?? {},
        }),
      }
    );
  }
}
