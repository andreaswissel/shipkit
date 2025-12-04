export interface FeatureSpec {
  name: string;
  description: string;
  requirements: string[];
  acceptanceCriteria?: string[];
}

export interface Component {
  id: string;
  name: string;
  description: string;
  props: PropDefinition[];
  source: string;
  framework: Framework;
}

export interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

export type Framework = "react" | "vue" | "svelte" | "solid" | "vanilla";

export interface GeneratedFeature {
  spec: FeatureSpec;
  components: GeneratedComponent[];
  entryPoint: string;
  dependencies: string[];
}

export interface GeneratedComponent {
  name: string;
  code: string;
  path: string;
  usedComponents: string[];
}

export interface ShipResult {
  success: boolean;
  feature: GeneratedFeature;
  files: GeneratedFile[];
  errors?: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  action: "create" | "update";
}

export interface AIProvider {
  name: string;
  generate(prompt: string, context: AIContext): Promise<string>;
}

export interface AIContext {
  components: Component[];
  existingCode?: string;
  framework: Framework;
  style?: StyleConfig;
}

export interface StyleConfig {
  cssFramework?: "tailwind" | "css-modules" | "styled-components" | "vanilla";
  designSystem?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ShipKitConfig {
  framework: Framework;
  componentsDir: string;
  outputDir: string;
  style?: StyleConfig;
  aiProvider: AIProvider;
}
