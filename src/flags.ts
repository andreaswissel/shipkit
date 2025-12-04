import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface FlagConfig {
  description: string;
  defaultEnabled: boolean;
  rolloutPercentage?: number;
}

export interface Flag {
  name: string;
  enabled: boolean;
  config: FlagConfig;
  createdAt: Date;
}

export interface EvalContext {
  userId?: string;
  attributes?: Record<string, unknown>;
}

export interface FeatureFlagProvider {
  createFlag(name: string, config: FlagConfig): Promise<Flag>;
  getFlag(name: string): Promise<Flag | null>;
  setEnabled(name: string, enabled: boolean): Promise<void>;
  evaluate(name: string, context?: EvalContext): Promise<boolean>;
}

export class InMemoryFlagProvider implements FeatureFlagProvider {
  private flags = new Map<string, Flag>();

  async createFlag(name: string, config: FlagConfig): Promise<Flag> {
    const flag: Flag = {
      name,
      enabled: config.defaultEnabled,
      config,
      createdAt: new Date(),
    };
    this.flags.set(name, flag);
    return flag;
  }

  async getFlag(name: string): Promise<Flag | null> {
    return this.flags.get(name) ?? null;
  }

  async setEnabled(name: string, enabled: boolean): Promise<void> {
    const flag = this.flags.get(name);
    if (!flag) {
      throw new Error(`Flag "${name}" not found`);
    }
    flag.enabled = enabled;
  }

  async evaluate(name: string, context?: EvalContext): Promise<boolean> {
    const flag = this.flags.get(name);
    if (!flag) {
      return false;
    }
    if (!flag.enabled) {
      return false;
    }
    if (flag.config.rolloutPercentage !== undefined && context?.userId) {
      const hash = this.hashUserId(context.userId, name);
      return hash < flag.config.rolloutPercentage;
    }
    return true;
  }

  private hashUserId(userId: string, flagName: string): number {
    const str = `${userId}:${flagName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }
}

interface StoredFlag {
  name: string;
  enabled: boolean;
  config: FlagConfig;
  createdAt: string;
}

export class FileFlagProvider implements FeatureFlagProvider {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  private async readFlags(): Promise<Map<string, Flag>> {
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      const data: StoredFlag[] = JSON.parse(content);
      const flags = new Map<string, Flag>();
      for (const stored of data) {
        flags.set(stored.name, {
          ...stored,
          createdAt: new Date(stored.createdAt),
        });
      }
      return flags;
    } catch {
      return new Map();
    }
  }

  private async writeFlags(flags: Map<string, Flag>): Promise<void> {
    const data: StoredFlag[] = Array.from(flags.values()).map((flag) => ({
      ...flag,
      createdAt: flag.createdAt.toISOString(),
    }));
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async createFlag(name: string, config: FlagConfig): Promise<Flag> {
    const flags = await this.readFlags();
    const flag: Flag = {
      name,
      enabled: config.defaultEnabled,
      config,
      createdAt: new Date(),
    };
    flags.set(name, flag);
    await this.writeFlags(flags);
    return flag;
  }

  async getFlag(name: string): Promise<Flag | null> {
    const flags = await this.readFlags();
    return flags.get(name) ?? null;
  }

  async setEnabled(name: string, enabled: boolean): Promise<void> {
    const flags = await this.readFlags();
    const flag = flags.get(name);
    if (!flag) {
      throw new Error(`Flag "${name}" not found`);
    }
    flag.enabled = enabled;
    await this.writeFlags(flags);
  }

  async evaluate(name: string, context?: EvalContext): Promise<boolean> {
    const flags = await this.readFlags();
    const flag = flags.get(name);
    if (!flag) {
      return false;
    }
    if (!flag.enabled) {
      return false;
    }
    if (flag.config.rolloutPercentage !== undefined && context?.userId) {
      const hash = this.hashUserId(context.userId, name);
      return hash < flag.config.rolloutPercentage;
    }
    return true;
  }

  private hashUserId(userId: string, flagName: string): number {
    const str = `${userId}:${flagName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }
}
