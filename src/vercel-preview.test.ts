import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VercelPreviewProvider } from "./vercel-preview.js";
import type { PreviewInput } from "./preview.js";

describe("VercelPreviewProvider", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    it("creates a Vercel deployment", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "dpl_abc123",
            url: "my-app-abc123.vercel.app",
            state: "BUILDING",
            createdAt: 1704067200000,
          }),
      });

      const provider = new VercelPreviewProvider({
        token: "test-token",
        projectId: "prj_test123",
      });

      const result = await provider.createPreview(createInput());

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.vercel.com/v13/deployments",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );

      expect(result.id).toBe("dpl_abc123");
      expect(result.url).toBe("https://my-app-abc123.vercel.app");
      expect(result.status).toBe("starting");
      expect(result.branchName).toBe("feature/shipkit-test-feature");
    });

    it("includes teamId in request when configured", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "dpl_abc123",
            url: "my-app-abc123.vercel.app",
            state: "READY",
            createdAt: Date.now(),
          }),
      });

      const provider = new VercelPreviewProvider({
        token: "test-token",
        projectId: "prj_test123",
        teamId: "team_xyz",
      });

      await provider.createPreview(createInput());

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.vercel.com/v13/deployments?teamId=team_xyz",
        expect.any(Object)
      );
    });

    it("maps READY state to ready status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "dpl_abc123",
            url: "my-app.vercel.app",
            state: "READY",
            createdAt: Date.now(),
          }),
      });

      const provider = new VercelPreviewProvider({
        token: "test-token",
        projectId: "prj_test123",
      });

      const result = await provider.createPreview(createInput());

      expect(result.status).toBe("ready");
    });

    it("maps ERROR state to failed status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "dpl_abc123",
            url: "my-app.vercel.app",
            state: "ERROR",
            createdAt: Date.now(),
          }),
      });

      const provider = new VercelPreviewProvider({
        token: "test-token",
        projectId: "prj_test123",
      });

      const result = await provider.createPreview(createInput());

      expect(result.status).toBe("failed");
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      const provider = new VercelPreviewProvider({
        token: "invalid-token",
        projectId: "prj_test123",
      });

      await expect(provider.createPreview(createInput())).rejects.toThrow(
        "Vercel API error: 401 - Unauthorized"
      );
    });
  });

  describe("destroyPreview", () => {
    it("deletes the deployment", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const provider = new VercelPreviewProvider({
        token: "test-token",
        projectId: "prj_test123",
      });

      await provider.destroyPreview("dpl_abc123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.vercel.com/v13/deployments/dpl_abc123",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("getPreviewStatus", () => {
    it("fetches and maps deployment status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "dpl_abc123",
            url: "my-app.vercel.app",
            state: "QUEUED",
            createdAt: Date.now(),
          }),
      });

      const provider = new VercelPreviewProvider({
        token: "test-token",
        projectId: "prj_test123",
      });

      const status = await provider.getPreviewStatus("dpl_abc123");

      expect(status).toBe("starting");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.vercel.com/v13/deployments/dpl_abc123",
        expect.any(Object)
      );
    });
  });
});
