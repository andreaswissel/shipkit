import type { FeatureSpec, GeneratedFeature, GeneratedFile, User } from "./types.js";
import type { Pipeline } from "./pipeline.js";

export type PreviewStatus = "pending" | "starting" | "ready" | "failed" | "destroyed";

export type SnapshotStrategyType = "none" | "full-db-dump" | "seed-script" | "custom";

export interface SnapshotStrategy {
  type: SnapshotStrategyType;
  anonymize?: boolean;
  customScript?: string;
}

export interface PreviewEnvironment {
  id: string;
  url?: string;
  status: PreviewStatus;
  createdAt: string;
  branchName: string;
}

export interface PreviewConfig {
  enabled: boolean;
  basePreviewUrl?: string;
  previewUrlPattern?: string;
  defaultSnapshotStrategy?: SnapshotStrategy;
  workflowName?: string;
  timeoutSeconds?: number;
}

export interface PreviewInput {
  feature: GeneratedFeature;
  files: GeneratedFile[];
  spec: FeatureSpec;
  user?: User;
  branchName: string;
  snapshotStrategy?: SnapshotStrategy;
}

export interface PreviewProvider {
  createPreview(input: PreviewInput): Promise<PreviewEnvironment>;
  destroyPreview(id: string): Promise<void>;
  getPreviewStatus?(id: string): Promise<PreviewStatus>;
}

export interface PipelinePreviewProviderConfig {
  workflowName: string;
  cleanupWorkflowName?: string;
  basePreviewUrl?: string;
  previewUrlPattern?: string;
  timeoutSeconds?: number;
}

export class PipelinePreviewProvider implements PreviewProvider {
  constructor(
    private readonly pipeline: Pipeline,
    private readonly config: PipelinePreviewProviderConfig
  ) {}

  async createPreview(input: PreviewInput): Promise<PreviewEnvironment> {
    const id = this.buildPreviewId(input.spec);
    const snapshotStrategy = input.snapshotStrategy ?? { type: "none" };

    await this.pipeline.triggerWorkflow(this.config.workflowName, {
      preview_id: id,
      branch: input.branchName,
      snapshot_strategy: snapshotStrategy.type,
      anonymize: String(snapshotStrategy.anonymize ?? false),
      custom_script: snapshotStrategy.customScript ?? "",
      feature_name: input.spec.name,
    });

    return {
      id,
      url: this.buildPreviewUrl(id),
      status: "starting",
      createdAt: new Date().toISOString(),
      branchName: input.branchName,
    };
  }

  async destroyPreview(id: string): Promise<void> {
    const cleanupWorkflow = this.config.cleanupWorkflowName ?? "shipkit-preview-cleanup.yml";
    await this.pipeline.triggerWorkflow(cleanupWorkflow, {
      preview_id: id,
    });
  }

  private buildPreviewId(spec: FeatureSpec): string {
    const slug = spec.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const timestamp = Date.now().toString(36);
    return `shipkit-${slug}-${timestamp}`;
  }

  private buildPreviewUrl(id: string): string | undefined {
    const { basePreviewUrl, previewUrlPattern } = this.config;

    if (!basePreviewUrl && !previewUrlPattern) {
      return undefined;
    }

    if (previewUrlPattern) {
      return previewUrlPattern
        .replace("{id}", id)
        .replace("{base}", basePreviewUrl ?? "");
    }

    return `${basePreviewUrl!.replace(/\/$/, "")}/${id}`;
  }
}
