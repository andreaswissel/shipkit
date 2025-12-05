import { describe, it, expect, vi, beforeEach } from "vitest";
import { PipelinePreviewProvider } from "./preview.js";
import type { Pipeline } from "./pipeline.js";
import type { PreviewInput } from "./preview.js";

describe("PipelinePreviewProvider", () => {
  const mockPipeline: Pipeline = {
    createBranch: vi.fn(),
    commit: vi.fn(),
    createPullRequest: vi.fn(),
    triggerWorkflow: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createInput = (overrides?: Partial<PreviewInput>): PreviewInput => ({
    feature: {
      spec: { name: "Test Feature", description: "A test", requirements: [] },
      components: [],
      entryPoint: "index.tsx",
      dependencies: [],
    },
    files: [],
    spec: { name: "Test Feature", description: "A test", requirements: [] },
    branchName: "feature/shipkit-test-feature",
    ...overrides,
  });

  describe("createPreview", () => {
    it("triggers workflow with correct inputs", async () => {
      const provider = new PipelinePreviewProvider(mockPipeline, {
        workflowName: "preview.yml",
        basePreviewUrl: "https://preview.example.com",
      });

      const input = createInput();
      const result = await provider.createPreview(input);

      expect(mockPipeline.triggerWorkflow).toHaveBeenCalledWith("preview.yml", {
        preview_id: expect.stringMatching(/^shipkit-test-feature-[a-z0-9]+$/),
        branch: "feature/shipkit-test-feature",
        snapshot_strategy: "none",
        anonymize: "false",
        custom_script: "",
        feature_name: "Test Feature",
      });

      expect(result.status).toBe("starting");
      expect(result.branchName).toBe("feature/shipkit-test-feature");
      expect(result.id).toMatch(/^shipkit-test-feature-[a-z0-9]+$/);
    });

    it("uses custom snapshot strategy", async () => {
      const provider = new PipelinePreviewProvider(mockPipeline, {
        workflowName: "preview.yml",
      });

      const input = createInput({
        snapshotStrategy: {
          type: "full-db-dump",
          anonymize: true,
          customScript: "scripts/snapshot.sh",
        },
      });

      await provider.createPreview(input);

      expect(mockPipeline.triggerWorkflow).toHaveBeenCalledWith("preview.yml", {
        preview_id: expect.any(String),
        branch: "feature/shipkit-test-feature",
        snapshot_strategy: "full-db-dump",
        anonymize: "true",
        custom_script: "scripts/snapshot.sh",
        feature_name: "Test Feature",
      });
    });

    it("generates URL from basePreviewUrl", async () => {
      const provider = new PipelinePreviewProvider(mockPipeline, {
        workflowName: "preview.yml",
        basePreviewUrl: "https://preview.example.com/",
      });

      const result = await provider.createPreview(createInput());

      expect(result.url).toMatch(
        /^https:\/\/preview\.example\.com\/shipkit-test-feature-[a-z0-9]+$/
      );
    });

    it("generates URL from previewUrlPattern", async () => {
      const provider = new PipelinePreviewProvider(mockPipeline, {
        workflowName: "preview.yml",
        previewUrlPattern: "https://{id}.preview.example.com",
      });

      const result = await provider.createPreview(createInput());

      expect(result.url).toMatch(
        /^https:\/\/shipkit-test-feature-[a-z0-9]+\.preview\.example\.com$/
      );
    });

    it("returns undefined URL if no URL config provided", async () => {
      const provider = new PipelinePreviewProvider(mockPipeline, {
        workflowName: "preview.yml",
      });

      const result = await provider.createPreview(createInput());

      expect(result.url).toBeUndefined();
    });

    it("includes createdAt timestamp", async () => {
      const provider = new PipelinePreviewProvider(mockPipeline, {
        workflowName: "preview.yml",
      });

      const before = new Date().toISOString();
      const result = await provider.createPreview(createInput());
      const after = new Date().toISOString();

      expect(result.createdAt >= before).toBe(true);
      expect(result.createdAt <= after).toBe(true);
    });
  });

  describe("destroyPreview", () => {
    it("triggers cleanup workflow", async () => {
      const provider = new PipelinePreviewProvider(mockPipeline, {
        workflowName: "preview.yml",
        cleanupWorkflowName: "cleanup.yml",
      });

      await provider.destroyPreview("shipkit-test-feature-abc123");

      expect(mockPipeline.triggerWorkflow).toHaveBeenCalledWith("cleanup.yml", {
        preview_id: "shipkit-test-feature-abc123",
      });
    });

    it("uses default cleanup workflow name", async () => {
      const provider = new PipelinePreviewProvider(mockPipeline, {
        workflowName: "preview.yml",
      });

      await provider.destroyPreview("shipkit-test-feature-abc123");

      expect(mockPipeline.triggerWorkflow).toHaveBeenCalledWith(
        "shipkit-preview-cleanup.yml",
        { preview_id: "shipkit-test-feature-abc123" }
      );
    });
  });

  describe("preview ID generation", () => {
    it("slugifies feature name correctly", async () => {
      const provider = new PipelinePreviewProvider(mockPipeline, {
        workflowName: "preview.yml",
      });

      const input = createInput({
        spec: {
          name: "Add User Auth & OAuth 2.0",
          description: "Auth feature",
          requirements: [],
        },
      });

      const result = await provider.createPreview(input);

      expect(result.id).toMatch(/^shipkit-add-user-auth-oauth-2-0-[a-z0-9]+$/);
    });
  });
});
