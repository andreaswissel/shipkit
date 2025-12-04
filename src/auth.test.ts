import { describe, it, expect } from "vitest";
import { MockAuthProvider, User, ShipAction } from "./auth.js";

describe("MockAuthProvider", () => {
  describe("admin role", () => {
    const adminUser: User = { id: "admin-1", email: "admin@test.com", roles: ["admin"] };

    it("can ship", async () => {
      const provider = new MockAuthProvider();
      const result = await provider.authorize(adminUser, "ship");
      expect(result.authorized).toBe(true);
    });

    it("can deploy", async () => {
      const provider = new MockAuthProvider();
      const result = await provider.authorize(adminUser, "deploy");
      expect(result.authorized).toBe(true);
    });

    it("can rollback", async () => {
      const provider = new MockAuthProvider();
      const result = await provider.authorize(adminUser, "rollback");
      expect(result.authorized).toBe(true);
    });
  });

  describe("developer role", () => {
    const devUser: User = { id: "dev-1", email: "dev@test.com", roles: ["developer"] };

    it("can ship", async () => {
      const provider = new MockAuthProvider();
      const result = await provider.authorize(devUser, "ship");
      expect(result.authorized).toBe(true);
    });

    it("cannot deploy", async () => {
      const provider = new MockAuthProvider();
      const result = await provider.authorize(devUser, "deploy");
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain("deploy");
    });

    it("cannot rollback", async () => {
      const provider = new MockAuthProvider();
      const result = await provider.authorize(devUser, "rollback");
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain("rollback");
    });
  });

  describe("viewer role (no matching role)", () => {
    const viewerUser: User = { id: "viewer-1", email: "viewer@test.com", roles: ["viewer"] };

    it("cannot ship", async () => {
      const provider = new MockAuthProvider();
      const result = await provider.authorize(viewerUser, "ship");
      expect(result.authorized).toBe(false);
    });

    it("cannot deploy", async () => {
      const provider = new MockAuthProvider();
      const result = await provider.authorize(viewerUser, "deploy");
      expect(result.authorized).toBe(false);
    });

    it("cannot rollback", async () => {
      const provider = new MockAuthProvider();
      const result = await provider.authorize(viewerUser, "rollback");
      expect(result.authorized).toBe(false);
    });
  });

  describe("custom role configurations", () => {
    it("allows custom roles for actions", async () => {
      const provider = new MockAuthProvider({
        allowedRoles: {
          ship: ["engineer"],
          deploy: ["engineer", "ops"],
          rollback: ["ops"],
        },
      });
      const engineer: User = { id: "eng-1", email: "eng@test.com", roles: ["engineer"] };

      expect((await provider.authorize(engineer, "ship")).authorized).toBe(true);
      expect((await provider.authorize(engineer, "deploy")).authorized).toBe(true);
      expect((await provider.authorize(engineer, "rollback")).authorized).toBe(false);
    });

    it("denies admin with custom config that excludes admin", async () => {
      const provider = new MockAuthProvider({
        allowedRoles: {
          ship: ["custom-only"],
          deploy: ["custom-only"],
          rollback: ["custom-only"],
        },
      });
      const adminUser: User = { id: "admin-1", email: "admin@test.com", roles: ["admin"] };

      expect((await provider.authorize(adminUser, "ship")).authorized).toBe(false);
    });
  });

  describe("explicit user allowlists", () => {
    it("allows user by ID regardless of roles", async () => {
      const provider = new MockAuthProvider({
        allowedUsers: ["special-user"],
      });
      const specialUser: User = { id: "special-user", email: "special@test.com", roles: [] };

      expect((await provider.authorize(specialUser, "ship")).authorized).toBe(true);
      expect((await provider.authorize(specialUser, "deploy")).authorized).toBe(true);
      expect((await provider.authorize(specialUser, "rollback")).authorized).toBe(true);
    });

    it("denies user not in allowlist without valid role", async () => {
      const provider = new MockAuthProvider({
        allowedUsers: ["other-user"],
      });
      const regularUser: User = { id: "regular-user", email: "regular@test.com", roles: [] };

      expect((await provider.authorize(regularUser, "ship")).authorized).toBe(false);
    });

    it("allowlist takes precedence over role check", async () => {
      const provider = new MockAuthProvider({
        allowedRoles: { ship: [], deploy: [], rollback: [] },
        allowedUsers: ["bypass-user"],
      });
      const bypassUser: User = { id: "bypass-user", email: "bypass@test.com", roles: [] };

      expect((await provider.authorize(bypassUser, "deploy")).authorized).toBe(true);
    });
  });
});
