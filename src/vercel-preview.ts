import type { PreviewProvider, PreviewInput, PreviewEnvironment, PreviewStatus } from "./preview.js";

export interface VercelPreviewConfig {
  token: string;
  teamId?: string;
  projectId: string;
  productionBranch?: string;
}

interface VercelDeployment {
  id: string;
  url: string;
  state: "BUILDING" | "ERROR" | "INITIALIZING" | "QUEUED" | "READY" | "CANCELED";
  createdAt: number;
}

export class VercelPreviewProvider implements PreviewProvider {
  private readonly baseUrl = "https://api.vercel.com";

  constructor(private readonly config: VercelPreviewConfig) {}

  async createPreview(input: PreviewInput): Promise<PreviewEnvironment> {
    const deployment = await this.triggerDeployment(input.branchName, input.spec.name);

    return {
      id: deployment.id,
      url: `https://${deployment.url}`,
      status: this.mapVercelState(deployment.state),
      createdAt: new Date(deployment.createdAt).toISOString(),
      branchName: input.branchName,
    };
  }

  async destroyPreview(id: string): Promise<void> {
    await this.request(`/v13/deployments/${id}`, {
      method: "DELETE",
    });
  }

  async getPreviewStatus(id: string): Promise<PreviewStatus> {
    const deployment = await this.request<VercelDeployment>(
      `/v13/deployments/${id}`
    );
    return this.mapVercelState(deployment.state);
  }

  private async triggerDeployment(
    branch: string,
    featureName: string
  ): Promise<VercelDeployment> {
    const teamQuery = this.config.teamId ? `?teamId=${this.config.teamId}` : "";

    const response = await this.request<VercelDeployment>(
      `/v13/deployments${teamQuery}`,
      {
        method: "POST",
        body: JSON.stringify({
          name: this.config.projectId,
          gitSource: {
            type: "github",
            ref: branch,
            repoId: this.config.projectId,
          },
          target: "preview",
          meta: {
            shipkitFeature: featureName,
          },
        }),
      }
    );

    return response;
  }

  private mapVercelState(state: VercelDeployment["state"]): PreviewStatus {
    switch (state) {
      case "READY":
        return "ready";
      case "BUILDING":
      case "INITIALIZING":
      case "QUEUED":
        return "starting";
      case "ERROR":
      case "CANCELED":
        return "failed";
      default:
        return "pending";
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel API error: ${response.status} - ${error}`);
    }

    if (options.method === "DELETE") {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }
}
