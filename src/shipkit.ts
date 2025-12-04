import { ComponentRegistry } from "./registry.js";
import type {
  AIContext,
  AIProvider,
  Component,
  FeatureSpec,
  Framework,
  GeneratedFeature,
  ShipKitConfig,
  ShipResult,
  StyleConfig,
} from "./types.js";

export class ShipKit {
  private registry: ComponentRegistry;
  private config: ShipKitConfig;

  constructor(config: ShipKitConfig) {
    this.config = config;
    this.registry = new ComponentRegistry();
  }

  registerComponent(component: Component): this {
    this.registry.register(component);
    return this;
  }

  registerComponents(components: Component[]): this {
    this.registry.registerMany(components);
    return this;
  }

  getRegistry(): ComponentRegistry {
    return this.registry;
  }

  async ship(spec: FeatureSpec): Promise<ShipResult> {
    const context = this.buildContext();
    const prompt = this.buildPrompt(spec, context);
    
    try {
      const response = await this.config.aiProvider.generate(prompt, context);
      const feature = this.parseResponse(response, spec);
      const files = this.generateFiles(feature);

      return {
        success: true,
        feature,
        files,
      };
    } catch (error) {
      return {
        success: false,
        feature: {
          spec,
          components: [],
          entryPoint: "",
          dependencies: [],
        },
        files: [],
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private buildContext(): AIContext {
    return {
      components: this.registry.getAll(),
      framework: this.config.framework,
      style: this.config.style,
    };
  }

  private buildPrompt(spec: FeatureSpec, context: AIContext): string {
    const componentContext = this.registry.toContext();
    
    return `You are a frontend engineer. Generate a ${context.framework} feature based on the following specification.

## Feature: ${spec.name}
${spec.description}

## Requirements:
${spec.requirements.map((r) => `- ${r}`).join("\n")}

${spec.acceptanceCriteria ? `## Acceptance Criteria:\n${spec.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}` : ""}

## Available Components:
${componentContext}

## Style Configuration:
- CSS Framework: ${context.style?.cssFramework || "vanilla"}
${context.style?.designSystem ? `- Design System: ${context.style.designSystem}` : ""}

## Instructions:
1. Use the available components where appropriate
2. Generate clean, production-ready code
3. Follow ${context.framework} best practices
4. Return the code in a structured JSON format with:
   - components: array of { name, code, path, usedComponents }
   - entryPoint: main component/file path
   - dependencies: any new npm dependencies needed

Return ONLY valid JSON, no markdown or explanation.`;
  }

  private parseResponse(response: string, spec: FeatureSpec): GeneratedFeature {
    try {
      const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        spec,
        components: parsed.components || [],
        entryPoint: parsed.entryPoint || "",
        dependencies: parsed.dependencies || [],
      };
    } catch {
      throw new Error("Failed to parse AI response as valid feature JSON");
    }
  }

  private generateFiles(feature: GeneratedFeature) {
    return feature.components.map((component) => ({
      path: component.path,
      content: component.code,
      action: "create" as const,
    }));
  }
}

export function createShipKit(config: ShipKitConfig): ShipKit {
  return new ShipKit(config);
}
