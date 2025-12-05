import type { SnapshotStrategy } from "./preview.js";

export interface DBBranch {
  id: string;
  name: string;
  connectionString: string;
  createdAt: string;
}

export interface DBSnapshotProvider {
  createBranch(name: string, strategy: SnapshotStrategy): Promise<DBBranch>;
  deleteBranch(id: string): Promise<void>;
}

export interface NeonConfig {
  apiKey: string;
  projectId: string;
  parentBranchId?: string;
}

export interface AnonymizationRule {
  table: string;
  column: string;
  strategy: "faker" | "hash" | "mask" | "null" | "custom";
  fakerType?: string;
  customFn?: string;
}

export interface AnonymizedSubsetConfig {
  tables: TableSubsetConfig[];
  anonymizationRules: AnonymizationRule[];
  samplePercentage?: number;
}

export interface TableSubsetConfig {
  name: string;
  include: boolean;
  samplePercentage?: number;
  where?: string;
}

interface NeonBranchResponse {
  branch: {
    id: string;
    name: string;
    created_at: string;
  };
  connection_uris: Array<{
    connection_uri: string;
  }>;
}

export class NeonDBSnapshotProvider implements DBSnapshotProvider {
  private readonly baseUrl = "https://console.neon.tech/api/v2";

  constructor(private readonly config: NeonConfig) {}

  async createBranch(name: string, strategy: SnapshotStrategy): Promise<DBBranch> {
    const branchName = this.sanitizeBranchName(name);
    const parentId = this.config.parentBranchId ?? "main";

    const response = await this.request<NeonBranchResponse>(
      `/projects/${this.config.projectId}/branches`,
      {
        method: "POST",
        body: JSON.stringify({
          branch: {
            name: branchName,
            parent_id: parentId,
          },
          endpoints: [
            {
              type: "read_write",
            },
          ],
        }),
      }
    );

    const branch: DBBranch = {
      id: response.branch.id,
      name: response.branch.name,
      connectionString: response.connection_uris[0]?.connection_uri ?? "",
      createdAt: response.branch.created_at,
    };

    if (strategy.anonymize) {
      await this.runAnonymization(branch.id);
    }

    return branch;
  }

  async deleteBranch(id: string): Promise<void> {
    await this.request(`/projects/${this.config.projectId}/branches/${id}`, {
      method: "DELETE",
    });
  }

  private async runAnonymization(branchId: string): Promise<void> {
    await this.request(
      `/projects/${this.config.projectId}/branches/${branchId}/run_sql`,
      {
        method: "POST",
        body: JSON.stringify({
          sql: this.buildAnonymizationSQL(),
        }),
      }
    );
  }

  private buildAnonymizationSQL(): string {
    return `
      -- Default anonymization for common PII columns
      UPDATE users SET 
        email = CONCAT('user_', id, '@example.com'),
        first_name = 'Test',
        last_name = 'User',
        phone = NULL
      WHERE email IS NOT NULL;
      
      -- Clear sensitive data
      TRUNCATE TABLE audit_logs;
      TRUNCATE TABLE sessions;
    `;
  }

  private sanitizeBranchName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 63);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Neon API error: ${response.status} - ${error}`);
    }

    if (options.method === "DELETE") {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }
}

export function buildAnonymizationScript(config: AnonymizedSubsetConfig): string {
  const statements: string[] = [];

  for (const table of config.tables) {
    if (!table.include) {
      statements.push(`TRUNCATE TABLE ${table.name} CASCADE;`);
      continue;
    }

    if (table.samplePercentage && table.samplePercentage < 100) {
      statements.push(`
        DELETE FROM ${table.name} 
        WHERE id NOT IN (
          SELECT id FROM ${table.name} 
          ${table.where ? `WHERE ${table.where}` : ""}
          ORDER BY RANDOM() 
          LIMIT (SELECT COUNT(*) * ${table.samplePercentage / 100} FROM ${table.name})
        );
      `);
    }
  }

  for (const rule of config.anonymizationRules) {
    const value = getAnonymizationValue(rule);
    statements.push(`UPDATE ${rule.table} SET ${rule.column} = ${value};`);
  }

  return statements.join("\n");
}

function getAnonymizationValue(rule: AnonymizationRule): string {
  switch (rule.strategy) {
    case "null":
      return "NULL";
    case "hash":
      return `MD5(${rule.column}::text)`;
    case "mask":
      return `CONCAT(LEFT(${rule.column}, 2), '****', RIGHT(${rule.column}, 2))`;
    case "faker":
      return getFakerSQL(rule.fakerType ?? "text");
    case "custom":
      return rule.customFn ?? "NULL";
    default:
      return "NULL";
  }
}

function getFakerSQL(fakerType: string): string {
  switch (fakerType) {
    case "email":
      return "CONCAT('user_', MD5(RANDOM()::text), '@example.com')";
    case "name":
      return "'Test User'";
    case "phone":
      return "'+1-555-0100'";
    case "address":
      return "'123 Test Street'";
    case "text":
    default:
      return "MD5(RANDOM()::text)";
  }
}
