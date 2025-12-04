import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { ComponentDiscovery } from "./discovery.js";

const fixturesDir = path.join(import.meta.dirname, "__fixtures__");

describe("ComponentDiscovery", () => {
  describe("discover", () => {
    it("discovers React components from .tsx files", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();

      expect(components).toHaveLength(2);
      const names = components.map((c) => c.name);
      expect(names).toContain("Button");
      expect(names).toContain("Card");
    });

    it("ignores non-component files", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();
      const names = components.map((c) => c.name);

      expect(names).not.toContain("helper");
    });

    it("handles empty directories gracefully", async () => {
      const emptyDir = path.join(fixturesDir, "empty");
      await fs.mkdir(emptyDir, { recursive: true });

      const discovery = new ComponentDiscovery({
        directory: emptyDir,
        framework: "react",
      });

      const components = await discovery.discover();
      expect(components).toHaveLength(0);

      await fs.rmdir(emptyDir);
    });

    it("handles non-existent directories gracefully", async () => {
      const discovery = new ComponentDiscovery({
        directory: "/nonexistent/path",
        framework: "react",
      });

      const components = await discovery.discover();
      expect(components).toHaveLength(0);
    });
  });

  describe("component name extraction", () => {
    it("extracts component names from exported functions", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();
      const button = components.find((c) => c.name === "Button");

      expect(button).toBeDefined();
      expect(button!.name).toBe("Button");
    });
  });

  describe("props extraction", () => {
    it("extracts props from interface definitions", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();
      const button = components.find((c) => c.name === "Button");

      expect(button).toBeDefined();
      expect(button!.props.length).toBeGreaterThan(0);

      const labelProp = button!.props.find((p) => p.name === "label");
      expect(labelProp).toBeDefined();
      expect(labelProp!.type).toBe("string");
      expect(labelProp!.required).toBe(true);
    });

    it("marks optional props correctly", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();
      const button = components.find((c) => c.name === "Button");

      const disabledProp = button!.props.find((p) => p.name === "disabled");
      expect(disabledProp).toBeDefined();
      expect(disabledProp!.required).toBe(false);
    });

    it("extracts prop descriptions from JSDoc", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();
      const button = components.find((c) => c.name === "Button");

      const labelProp = button!.props.find((p) => p.name === "label");
      expect(labelProp!.description).toBe("The button label");
    });
  });

  describe("JSDoc description extraction", () => {
    it("extracts JSDoc description from component", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();
      const card = components.find((c) => c.name === "Card");

      expect(card).toBeDefined();
      expect(card!.description).toBe(
        "A card component for displaying content in a container."
      );
    });

    it("returns empty string when no JSDoc present", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();
      const button = components.find((c) => c.name === "Button");

      expect(button!.description).toBe("");
    });
  });

  describe("ID generation", () => {
    it("generates unique IDs based on file path", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();

      const ids = components.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("generates lowercase IDs with dashes", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();

      for (const component of components) {
        expect(component.id).toMatch(/^[a-z0-9-]+$/);
      }
    });
  });

  describe("framework detection", () => {
    it("sets correct framework on discovered components", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
      });

      const components = await discovery.discover();

      for (const component of components) {
        expect(component.framework).toBe("react");
      }
    });
  });

  describe("custom extensions", () => {
    it("respects custom extensions option", async () => {
      const discovery = new ComponentDiscovery({
        directory: fixturesDir,
        framework: "react",
        extensions: [".jsx"],
      });

      const components = await discovery.discover();
      expect(components).toHaveLength(0);
    });
  });
});
