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
import type {
  PreviewConfig,
  PreviewEnvironment,
  PreviewProvider,
  SnapshotStrategy,
} from "./preview.js";

export interface ShipKitFullConfig extends ShipKitConfig {
  authProvider?: AuthProvider;
  flagProvider?: FeatureFlagProvider;
  pipeline?: Pipeline;
  previewProvider?: PreviewProvider;
  previewConfig?: PreviewConfig;
}

export interface FullShipResult extends ShipResult {
  validation?: ValidationResult;
  writeResult?: WriteResult;
  pullRequest?: PullRequest;
  flagName?: string;
  previewEnvironment?: PreviewEnvironment;
  branchName?: string;
}

interface ResolvedShipOptions {
  validate: boolean;
  write: boolean;
  dryRun: boolean;
  createPR: boolean;
  createFlag: boolean;
  branchPrefix: string;
  createPreview: boolean;
  snapshotStrategy?: SnapshotStrategy;
}

interface AIResponseComponent {
  name: string;
  code: string;
  path: string;
  usedComponents?: string[];
}

interface AIResponse {
  components?: AIResponseComponent[];
  entryPoint?: string;
  dependencies?: string[];
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
    const opts = this.resolveOptions(options);

    const authError = await this.checkAuthorization(spec, user);
    if (authError) return authError;

    const featureResult = await this.generateFeature(spec);
    if (!featureResult.success) return featureResult;

    const feature = featureResult.feature;
    const files = this.generateFiles(feature);
    const result: FullShipResult = { success: true, feature, files };

    const validationError = await this.runValidation(result, opts);
    if (validationError) return validationError;

    const writeError = await this.writeFiles(result, opts);
    if (writeError) return writeError;

    const prError = await this.createPullRequest(spec, result, opts);
    if (prError) return prError;

    const previewError = await this.createPreviewEnvironment(spec, result, opts, user);
    if (previewError) return previewError;

    await this.createFeatureFlag(spec, result, opts);

    return result;
  }

  private resolveOptions(options: ShipOptions): ResolvedShipOptions {
    return {
      validate: options.validate ?? true,
      write: options.write ?? true,
      dryRun: options.dryRun ?? false,
      createPR: options.createPR ?? false,
      createFlag: options.createFlag ?? false,
      branchPrefix: options.branchPrefix ?? "feature/shipkit-",
      createPreview: options.createPreview ?? false,
      snapshotStrategy: options.snapshotStrategy,
    };
  }

  private failureResult(spec: FeatureSpec, errors: string[]): FullShipResult {
    return {
      success: false,
      feature: this.emptyFeature(spec),
      files: [],
      errors,
    };
  }

  private async checkAuthorization(
    spec: FeatureSpec,
    user?: User
  ): Promise<FullShipResult | null> {
    if (!user || !this.config.authProvider) return null;

    const authResult = await this.config.authProvider.authorize(user, "ship");
    if (!authResult.authorized) {
      return this.failureResult(spec, [authResult.reason ?? "Authorization denied"]);
    }
    return null;
  }

  private async generateFeature(
    spec: FeatureSpec
  ): Promise<{ success: true; feature: GeneratedFeature } | FullShipResult> {
    const context = this.buildContext();
    const prompt = this.buildPrompt(spec, context);

    try {
      const response = await this.config.aiProvider.generate(prompt, context);
      const feature = this.parseResponse(response, spec);
      return { success: true, feature };
    } catch (error) {
      return this.failureResult(
        spec,
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }

  private async runValidation(
    result: FullShipResult,
    opts: ResolvedShipOptions
  ): Promise<FullShipResult | null> {
    if (!opts.validate) return null;

    const codeComponents = result.feature.components.filter(
      (component) => this.isCodeFile(component.path)
    );

    const validations = await Promise.all(
      codeComponents.map((component) =>
        this.validator.validate(component.code, this.config.framework)
      )
    );

    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];

    for (const v of validations) {
      validationErrors.push(...v.errors);
      validationWarnings.push(...v.warnings);
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

    return null;
  }

  private async writeFiles(
    result: FullShipResult,
    opts: ResolvedShipOptions
  ): Promise<FullShipResult | null> {
    if (!opts.write || opts.createPR) return null;

    result.writeResult = await this.writer.write(result.files, { dryRun: opts.dryRun });
    if (!result.writeResult.success) {
      result.success = false;
      result.errors = result.writeResult.errors.map((e) => e.error);
      return result;
    }

    return null;
  }

  private async createPullRequest(
    spec: FeatureSpec,
    result: FullShipResult,
    opts: ResolvedShipOptions
  ): Promise<FullShipResult | null> {
    if (!opts.createPR) return null;

    if (!this.config.pipeline) {
      result.success = false;
      result.errors = ["createPR requested but no pipeline configured"];
      return result;
    }

    const branchName = `${opts.branchPrefix}${this.slugify(spec.name)}`;
    result.branchName = branchName;

    try {
      await this.config.pipeline.createBranch(branchName);
      await this.config.pipeline.commit(
        result.files,
        `feat: add ${spec.name} feature via ShipKit`
      );
      result.pullRequest = await this.config.pipeline.createPullRequest({
        title: `feat: ${spec.name}`,
        body: this.buildPRDescription(spec, result.feature),
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

    return null;
  }

  private async createPreviewEnvironment(
    spec: FeatureSpec,
    result: FullShipResult,
    opts: ResolvedShipOptions,
    user?: User
  ): Promise<FullShipResult | null> {
    if (!opts.createPreview) return null;

    if (!this.config.previewProvider) {
      result.success = false;
      result.errors = [
        ...(result.errors ?? []),
        "createPreview requested but no preview provider configured",
      ];
      return result;
    }

    const branchName = result.branchName ?? `${opts.branchPrefix}${this.slugify(spec.name)}`;
    const snapshotStrategy =
      opts.snapshotStrategy ?? this.config.previewConfig?.defaultSnapshotStrategy;

    try {
      const env = await this.config.previewProvider.createPreview({
        feature: result.feature,
        files: result.files,
        spec,
        user,
        branchName,
        snapshotStrategy,
      });
      result.previewEnvironment = env;
    } catch (error) {
      result.success = false;
      result.errors = [
        ...(result.errors ?? []),
        `Preview error: ${error instanceof Error ? error.message : String(error)}`,
      ];
      return result;
    }

    return null;
  }

  private async createFeatureFlag(
    spec: FeatureSpec,
    result: FullShipResult,
    opts: ResolvedShipOptions
  ): Promise<void> {
    if (!opts.createFlag) return;

    if (!this.config.flagProvider) {
      result.errors = result.errors ?? [];
      result.errors.push("createFlag requested but no flag provider configured");
      return;
    }

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

  private sanitizeForCode(name: string): string {
    return name.replace(/["'`\\]/g, "");
  }

  private isCodeFile(path: string): boolean {
    const codeExtensions = [".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"];
    return codeExtensions.some((ext) => path.endsWith(ext));
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
    const safeName = this.sanitizeForCode(spec.name);
    const safeDescription = this.sanitizeForCode(spec.description);

    return `You are a frontend engineer. Generate a ${context.framework} feature based on the following specification.

## Feature: ${safeName}
${safeDescription}

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
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse AI response as valid JSON");
    }

    const data = parsed as Partial<AIResponse>;
    const components = Array.isArray(data.components) ? data.components : [];

    const safeComponents = components
      .filter(
        (c): c is AIResponseComponent =>
          !!c &&
          typeof c.name === "string" &&
          typeof c.code === "string" &&
          typeof c.path === "string"
      )
      .map((c) => ({
        name: c.name,
        code: c.code,
        path: c.path,
        usedComponents: Array.isArray(c.usedComponents) ? c.usedComponents : [],
      }));

    return {
      spec,
      components: safeComponents,
      entryPoint: typeof data.entryPoint === "string" ? data.entryPoint : "",
      dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
    };
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
