import { ComponentRegistry } from "./registry.js";
import { CodeValidator } from "./validator.js";
import { FileWriter } from "./writer.js";
import type {
  AIContext,
  AIProvider,
  AuthProvider,
  Component,
  FeatureSpec,
  Framework,
  GeneratedFeature,
  ShipKitConfig,
  ShipOptions,
  ShipResult,
  StyleConfig,
  User,
  ValidationResult,
} from "./types.js";
import type { FeatureFlagProvider, FlagConfig } from "./flags.js";
import type { Pipeline, PullRequest } from "./pipeline.js";
import type { WriteResult } from "./writer.js";

export interface ShipKitFullConfig extends ShipKitConfig {
  authProvider?: AuthProvider;
  flagProvider?: FeatureFlagProvider;
  pipeline?: Pipeline;
}

export interface FullShipResult extends ShipResult {
  validation?: ValidationResult;
  writeResult?: WriteResult;
  pullRequest?: PullRequest;
  flagName?: string;
}

export class ShipKit {
  private registry: ComponentRegistry;
  private config: ShipKitFullConfig;
  private validator: CodeValidator;
  private writer: FileWriter;

  constructor(config: ShipKitFullConfig) {
    this.config = config;
    this.registry = new ComponentRegistry();
    this.validator = new CodeValidator();
    this.writer = new FileWriter(config.outputDir);
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

  async ship(
    spec: FeatureSpec,
    options: ShipOptions = {},
    user?: User
  ): Promise<FullShipResult> {
    const {
      validate = true,
      write = true,
      dryRun = false,
      createPR = false,
      createFlag = false,
      branchPrefix = "feature/shipkit-",
    } = options;

    if (user && this.config.authProvider) {
      const authResult = await this.config.authProvider.authorize(user, "ship");
      if (!authResult.authorized) {
        return {
          success: false,
          feature: this.emptyFeature(spec),
          files: [],
          errors: [authResult.reason ?? "Authorization denied"],
        };
      }
    }

    const context = this.buildContext();
    const prompt = this.buildPrompt(spec, context);

    let feature: GeneratedFeature;
    try {
      const response = await this.config.aiProvider.generate(prompt, context);
      feature = this.parseResponse(response, spec);
    } catch (error) {
      return {
        success: false,
        feature: this.emptyFeature(spec),
        files: [],
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }

    const files = this.generateFiles(feature);
    const result: FullShipResult = {
      success: true,
      feature,
      files,
    };

    if (validate) {
      const validationErrors: string[] = [];
      const validationWarnings: string[] = [];

      for (const component of feature.components) {
        const validation = await this.validator.validate(
          component.code,
          this.config.framework
        );
        validationErrors.push(...validation.errors);
        validationWarnings.push(...validation.warnings);
      }

      result.validation = {
        valid: validationErrors.length === 0,
        errors: validationErrors,
        warnings: validationWarnings,
      };

      if (!result.validation.valid) {
        result.success = false;
        result.errors = validationErrors;
        return result;
      }
    }

    if (write && !createPR) {
      result.writeResult = await this.writer.write(files, { dryRun });
      if (!result.writeResult.success) {
        result.success = false;
        result.errors = result.writeResult.errors.map((e) => e.error);
        return result;
      }
    }

    if (createPR && this.config.pipeline) {
      const branchName = `${branchPrefix}${this.slugify(spec.name)}`;

      try {
        await this.config.pipeline.createBranch(branchName);
        await this.config.pipeline.commit(
          files,
          `feat: add ${spec.name} feature via ShipKit`
        );
        result.pullRequest = await this.config.pipeline.createPullRequest({
          title: `feat: ${spec.name}`,
          body: this.buildPRDescription(spec, feature),
          head: branchName,
          base: "main",
          labels: ["shipkit", "generated"],
        });
      } catch (error) {
        result.success = false;
        result.errors = [
          `Pipeline error: ${error instanceof Error ? error.message : String(error)}`,
        ];
        return result;
      }
    }

    if (createFlag && this.config.flagProvider) {
      const flagName = `shipkit-${this.slugify(spec.name)}`;
      const flagConfig: FlagConfig = {
        description: `Feature flag for ${spec.name}`,
        defaultEnabled: false,
        rolloutPercentage: 0,
      };

      try {
        await this.config.flagProvider.createFlag(flagName, flagConfig);
        result.flagName = flagName;
      } catch (error) {
        result.errors = result.errors ?? [];
        result.errors.push(
          `Flag creation warning: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  private emptyFeature(spec: FeatureSpec): GeneratedFeature {
    return {
      spec,
      components: [],
      entryPoint: "",
      dependencies: [],
    };
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private buildPRDescription(
    spec: FeatureSpec,
    feature: GeneratedFeature
  ): string {
    const parts = [
      `## ${spec.name}`,
      "",
      spec.description,
      "",
      "### Requirements",
      ...spec.requirements.map((r) => `- ${r}`),
    ];

    if (spec.acceptanceCriteria?.length) {
      parts.push("", "### Acceptance Criteria");
      parts.push(...spec.acceptanceCriteria.map((c) => `- [ ] ${c}`));
    }

    parts.push("", "### Generated Files");
    parts.push(...feature.components.map((c) => `- \`${c.path}\``));

    if (feature.dependencies.length) {
      parts.push("", "### New Dependencies");
      parts.push("```bash");
      parts.push(`npm install ${feature.dependencies.join(" ")}`);
      parts.push("```");
    }

    parts.push("", "---", "_Generated by ShipKit_");

    return parts.join("\n");
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

export function createShipKit(config: ShipKitFullConfig): ShipKit {
  return new ShipKit(config);
}
