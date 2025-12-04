import * as fs from "fs/promises";
import * as path from "path";
import { Component, Framework, PropDefinition } from "./types.js";

export interface DiscoveryOptions {
  directory: string;
  framework: Framework;
  extensions?: string[];
}

export class ComponentDiscovery {
  private directory: string;
  private framework: Framework;
  private extensions: string[];

  constructor(options: DiscoveryOptions) {
    this.directory = options.directory;
    this.framework = options.framework;
    this.extensions = options.extensions ?? this.getDefaultExtensions();
  }

  private getDefaultExtensions(): string[] {
    switch (this.framework) {
      case "react":
        return [".tsx", ".jsx"];
      case "vue":
        return [".vue"];
      case "svelte":
        return [".svelte"];
      case "solid":
        return [".tsx", ".jsx"];
      case "vanilla":
        return [".ts", ".js"];
    }
  }

  async discover(): Promise<Component[]> {
    const files = await this.findComponentFiles(this.directory);
    const components: Component[] = [];

    for (const file of files) {
      const component = await this.parseComponent(file);
      if (component) {
        components.push(component);
      }
    }

    return components;
  }

  private async findComponentFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          const subFiles = await this.findComponentFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && this.extensions.some((ext) => entry.name.endsWith(ext))) {
          if (this.isComponentFile(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Directory doesn't exist or isn't readable
    }

    return files;
  }

  private isComponentFile(filename: string): boolean {
    const name = path.basename(filename, path.extname(filename));
    return /^[A-Z]/.test(name) || name.endsWith(".component");
  }

  private async parseComponent(filePath: string): Promise<Component | null> {
    const content = await fs.readFile(filePath, "utf-8");

    switch (this.framework) {
      case "react":
      case "solid":
        return this.parseReactComponent(filePath, content);
      case "vue":
        return this.parseVueComponent(filePath, content);
      case "svelte":
        return this.parseSvelteComponent(filePath, content);
      default:
        return null;
    }
  }

  private parseReactComponent(filePath: string, content: string): Component | null {
    const componentName = this.extractReactComponentName(content, filePath);
    if (!componentName) return null;

    const description = this.extractJSDocDescription(content, componentName);
    const props = this.extractReactProps(content, componentName);

    return {
      id: this.generateId(filePath),
      name: componentName,
      description,
      props,
      source: filePath,
      framework: this.framework,
    };
  }

  private extractReactComponentName(content: string, filePath: string): string | null {
    const patterns = [
      /export\s+(?:default\s+)?function\s+([A-Z][a-zA-Z0-9]*)/,
      /export\s+const\s+([A-Z][a-zA-Z0-9]*)\s*[=:]/,
      /const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*(?:React\.)?(?:memo|forwardRef)?\s*\(/,
      /function\s+([A-Z][a-zA-Z0-9]*)\s*\(/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }

    const basename = path.basename(filePath, path.extname(filePath));
    if (/^[A-Z]/.test(basename)) return basename;

    return null;
  }

  private extractJSDocDescription(content: string, componentName: string): string {
    const jsdocPattern = new RegExp(
      `/\\*\\*[\\s\\S]*?\\*/\\s*(?:export\\s+)?(?:default\\s+)?(?:function|const)\\s+${componentName}`,
      "m"
    );
    const match = content.match(jsdocPattern);

    if (match) {
      const jsdoc = match[0];
      const descMatch = jsdoc.match(/\/\*\*\s*\n?\s*\*?\s*(.+?)(?:\n|\*\/)/);
      if (descMatch) {
        return descMatch[1].replace(/^\s*\*\s*/, "").trim();
      }
    }

    return "";
  }

  private extractReactProps(content: string, componentName: string): PropDefinition[] {
    const props: PropDefinition[] = [];

    const interfacePatterns = [
      new RegExp(`interface\\s+${componentName}Props\\s*\\{([^}]+)\\}`, "s"),
      new RegExp(`type\\s+${componentName}Props\\s*=\\s*\\{([^}]+)\\}`, "s"),
      /interface\s+Props\s*\{([^}]+)\}/s,
      /type\s+Props\s*=\s*\{([^}]+)\}/s,
    ];

    let propsContent: string | null = null;
    for (const pattern of interfacePatterns) {
      const match = content.match(pattern);
      if (match) {
        propsContent = match[1];
        break;
      }
    }

    if (!propsContent) {
      const inlinePattern = new RegExp(
        `function\\s+${componentName}\\s*\\(\\s*\\{([^}]+)\\}\\s*:\\s*\\{([^}]+)\\}`,
        "s"
      );
      const inlineMatch = content.match(inlinePattern);
      if (inlineMatch) {
        propsContent = inlineMatch[2];
      }
    }

    if (propsContent) {
      const propPattern = /(?:\/\*\*\s*(.+?)\s*\*\/\s*)?(\w+)(\?)?:\s*([^;,\n]+)/g;
      let propMatch;

      while ((propMatch = propPattern.exec(propsContent)) !== null) {
        const [, jsdoc, name, optional, type] = propMatch;
        if (name && type && !name.startsWith("//")) {
          props.push({
            name,
            type: type.trim(),
            required: !optional,
            description: jsdoc?.trim(),
          });
        }
      }
    }

    return props;
  }

  private parseVueComponent(filePath: string, content: string): Component | null {
    const componentName = path.basename(filePath, ".vue");
    const description = this.extractVueDescription(content);
    const props = this.extractVueProps(content);

    return {
      id: this.generateId(filePath),
      name: componentName,
      description,
      props,
      source: filePath,
      framework: "vue",
    };
  }

  private extractVueDescription(content: string): string {
    const commentMatch = content.match(/<!--\s*@description\s+(.+?)\s*-->/);
    return commentMatch ? commentMatch[1] : "";
  }

  private extractVueProps(content: string): PropDefinition[] {
    const props: PropDefinition[] = [];

    const definePropsMatch = content.match(/defineProps<\{([^}]+)\}>/s);
    if (definePropsMatch) {
      const propsContent = definePropsMatch[1];
      const propPattern = /(\w+)(\?)?:\s*([^;,\n]+)/g;
      let match;

      while ((match = propPattern.exec(propsContent)) !== null) {
        props.push({
          name: match[1],
          type: match[3].trim(),
          required: !match[2],
        });
      }
    }

    return props;
  }

  private parseSvelteComponent(filePath: string, content: string): Component | null {
    const componentName = path.basename(filePath, ".svelte");
    const description = this.extractSvelteDescription(content);
    const props = this.extractSvelteProps(content);

    return {
      id: this.generateId(filePath),
      name: componentName,
      description,
      props,
      source: filePath,
      framework: "svelte",
    };
  }

  private extractSvelteDescription(content: string): string {
    const commentMatch = content.match(/<!--\s*@description\s+(.+?)\s*-->/);
    return commentMatch ? commentMatch[1] : "";
  }

  private extractSvelteProps(content: string): PropDefinition[] {
    const props: PropDefinition[] = [];

    const exportPattern = /export\s+let\s+(\w+)(?::\s*([^=;\n]+))?(?:\s*=\s*([^;\n]+))?/g;
    let match;

    while ((match = exportPattern.exec(content)) !== null) {
      props.push({
        name: match[1],
        type: match[2]?.trim() || "unknown",
        required: !match[3],
        defaultValue: match[3]?.trim(),
      });
    }

    return props;
  }

  private generateId(filePath: string): string {
    const relative = path.relative(this.directory, filePath);
    return relative
      .replace(/\\/g, "/")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, "-")
      .toLowerCase();
  }
}
