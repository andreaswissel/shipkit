import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  NeonDBSnapshotProvider,
  buildAnonymizationScript,
  type AnonymizedSubsetConfig,
} from "./db-snapshot.js";

describe("NeonDBSnapshotProvider", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("createBranch", () => {
    it("creates a Neon branch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            branch: {
              id: "br_abc123",
              name: "shipkit-test-feature",
              created_at: "2025-01-01T00:00:00Z",
            },
            connection_uris: [
              {
                connection_uri: "postgres://user:pass@ep-test.neon.tech/db",
              },
            ],
          }),
      });

      const provider = new NeonDBSnapshotProvider({
        apiKey: "test-key",
        projectId: "prj_test",
      });

      const result = await provider.createBranch("shipkit-test-feature", {
        type: "none",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://console.neon.tech/api/v2/projects/prj_test/branches",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        })
      );

      expect(result.id).toBe("br_abc123");
      expect(result.name).toBe("shipkit-test-feature");
      expect(result.connectionString).toBe(
        "postgres://user:pass@ep-test.neon.tech/db"
      );
    });

    it("runs anonymization when strategy.anonymize is true", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              branch: {
                id: "br_abc123",
                name: "test-branch",
                created_at: "2025-01-01T00:00:00Z",
              },
              connection_uris: [{ connection_uri: "postgres://test" }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      const provider = new NeonDBSnapshotProvider({
        apiKey: "test-key",
        projectId: "prj_test",
      });

      await provider.createBranch("test-branch", {
        type: "full-db-dump",
        anonymize: true,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        "https://console.neon.tech/api/v2/projects/prj_test/branches/br_abc123/run_sql",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("uses parent branch ID when configured", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            branch: {
              id: "br_child",
              name: "child-branch",
              created_at: "2025-01-01T00:00:00Z",
            },
            connection_uris: [{ connection_uri: "postgres://test" }],
          }),
      });

      const provider = new NeonDBSnapshotProvider({
        apiKey: "test-key",
        projectId: "prj_test",
        parentBranchId: "br_staging",
      });

      await provider.createBranch("child-branch", { type: "none" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.branch.parent_id).toBe("br_staging");
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      });

      const provider = new NeonDBSnapshotProvider({
        apiKey: "invalid-key",
        projectId: "prj_test",
      });

      await expect(
        provider.createBranch("test", { type: "none" })
      ).rejects.toThrow("Neon API error: 403 - Forbidden");
    });
  });

  describe("deleteBranch", () => {
    it("deletes the branch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const provider = new NeonDBSnapshotProvider({
        apiKey: "test-key",
        projectId: "prj_test",
      });

      await provider.deleteBranch("br_abc123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://console.neon.tech/api/v2/projects/prj_test/branches/br_abc123",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });
});

describe("buildAnonymizationScript", () => {
  it("generates TRUNCATE for excluded tables", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [{ name: "audit_logs", include: false }],
      anonymizationRules: [],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain("TRUNCATE TABLE audit_logs CASCADE;");
  });

  it("generates DELETE for sampled tables", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [{ name: "users", include: true, samplePercentage: 10 }],
      anonymizationRules: [],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain("DELETE FROM users");
    expect(script).toContain("0.1");
    expect(script).toContain("ORDER BY RANDOM()");
  });

  it("generates DELETE with WHERE clause when provided", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [
        {
          name: "orders",
          include: true,
          samplePercentage: 5,
          where: "status = 'completed'",
        },
      ],
      anonymizationRules: [],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain("WHERE status = 'completed'");
  });

  it("generates UPDATE for null strategy", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [],
      anonymizationRules: [
        { table: "users", column: "ssn", strategy: "null" },
      ],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain("UPDATE users SET ssn = NULL;");
  });

  it("generates UPDATE for hash strategy", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [],
      anonymizationRules: [
        { table: "users", column: "email", strategy: "hash" },
      ],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain("UPDATE users SET email = MD5(email::text);");
  });

  it("generates UPDATE for mask strategy", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [],
      anonymizationRules: [
        { table: "users", column: "phone", strategy: "mask" },
      ],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain("LEFT(phone, 2)");
    expect(script).toContain("'****'");
    expect(script).toContain("RIGHT(phone, 2)");
  });

  it("generates UPDATE for faker email", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [],
      anonymizationRules: [
        { table: "users", column: "email", strategy: "faker", fakerType: "email" },
      ],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain("@example.com");
  });

  it("generates UPDATE for faker name", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [],
      anonymizationRules: [
        { table: "users", column: "name", strategy: "faker", fakerType: "name" },
      ],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain("'Test User'");
  });

  it("uses custom function when provided", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [],
      anonymizationRules: [
        {
          table: "users",
          column: "data",
          strategy: "custom",
          customFn: "JSONB_SET(data, '{pii}', 'null')",
        },
      ],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain(
      "UPDATE users SET data = JSONB_SET(data, '{pii}', 'null');"
    );
  });

  it("combines table sampling and anonymization rules", () => {
    const config: AnonymizedSubsetConfig = {
      tables: [
        { name: "users", include: true, samplePercentage: 1 },
        { name: "sessions", include: false },
      ],
      anonymizationRules: [
        { table: "users", column: "email", strategy: "faker", fakerType: "email" },
        { table: "users", column: "phone", strategy: "null" },
      ],
    };

    const script = buildAnonymizationScript(config);

    expect(script).toContain("DELETE FROM users");
    expect(script).toContain("TRUNCATE TABLE sessions CASCADE;");
    expect(script).toContain("UPDATE users SET email =");
    expect(script).toContain("UPDATE users SET phone = NULL;");
  });
});
