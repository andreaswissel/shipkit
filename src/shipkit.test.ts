import { describe, it, expect, vi } from "vitest";
import { ShipKit, createShipKit } from "./shipkit.js";
import type { AIProvider, FeatureSpec } from "./types.js";

function createMockAIProvider(response: string): AIProvider {
  return {
    name: "mock",
    generate: vi.fn().mockResolvedValue(response),
  };
}

describe("ShipKit", () => {
  describe("sanitization of feature names with special characters", () => {
    it("handles double quotes in feature name", async () => {
      const mockResponse = JSON.stringify({
        components: [
          {
            name: "TestComponent",
            code: 'export function TestComponent() { return <div>Hello</div>; }',
            path: "components/TestComponent.tsx",
          },
        ],
        entryPoint: "components/TestComponent.tsx",
        dependencies: [],
      });

      const aiProvider = createMockAIProvider(mockResponse);
      const kit = createShipKit({
        aiProvider,
        framework: "react",
        componentsDir: "./components",
        outputDir: "./output",
      });

      const spec: FeatureSpec = {
        name: 'My "Awesome" Feature',
        description: 'A feature with "quotes" in description',
        requirements: ["Should work"],
      };

      const result = await kit.ship(spec, { validate: false, write: false });

      expect(result.success).toBe(true);
      const prompt = (aiProvider.generate as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prompt).not.toContain('"Awesome"');
      expect(prompt).not.toContain('"quotes"');
      expect(prompt).toContain("My Awesome Feature");
      expect(prompt).toContain("A feature with quotes in description");
    });

    it("handles single quotes in feature name", async () => {
      const mockResponse = JSON.stringify({
        components: [],
        entryPoint: "",
        dependencies: [],
      });

      const aiProvider = createMockAIProvider(mockResponse);
      const kit = createShipKit({
        aiProvider,
        framework: "react",
        componentsDir: "./components",
        outputDir: "./output",
      });

      const spec: FeatureSpec = {
        name: "It's a Feature",
        description: "User's dashboard",
        requirements: ["Should work"],
      };

      await kit.ship(spec, { validate: false, write: false });

      const prompt = (aiProvider.generate as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prompt).toContain("Its a Feature");
      expect(prompt).toContain("Users dashboard");
    });

    it("handles backticks in feature name", async () => {
      const mockResponse = JSON.stringify({
        components: [],
        entryPoint: "",
        dependencies: [],
      });

      const aiProvider = createMockAIProvider(mockResponse);
      const kit = createShipKit({
        aiProvider,
        framework: "react",
        componentsDir: "./components",
        outputDir: "./output",
      });

      const spec: FeatureSpec = {
        name: "Feature with `code`",
        description: "Uses `template` literals",
        requirements: ["Should work"],
      };

      await kit.ship(spec, { validate: false, write: false });

      const prompt = (aiProvider.generate as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prompt).toContain("Feature with code");
      expect(prompt).toContain("Uses template literals");
    });

    it("handles backslashes in feature name", async () => {
      const mockResponse = JSON.stringify({
        components: [],
        entryPoint: "",
        dependencies: [],
      });

      const aiProvider = createMockAIProvider(mockResponse);
      const kit = createShipKit({
        aiProvider,
        framework: "react",
        componentsDir: "./components",
        outputDir: "./output",
      });

      const spec: FeatureSpec = {
        name: "Path\\Feature",
        description: "C:\\Users\\test",
        requirements: ["Should work"],
      };

      await kit.ship(spec, { validate: false, write: false });

      const prompt = (aiProvider.generate as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(prompt).toContain("PathFeature");
      expect(prompt).toContain("C:Userstest");
    });
  });

  describe("createShipKit factory", () => {
    it("creates a ShipKit instance", () => {
      const kit = createShipKit({
        aiProvider: createMockAIProvider("{}"),
        framework: "react",
        componentsDir: "./components",
        outputDir: "./output",
      });

      expect(kit).toBeInstanceOf(ShipKit);
    });
  });
});
