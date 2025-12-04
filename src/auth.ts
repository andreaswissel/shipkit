export interface User {
  id: string;
  email: string;
  roles: string[];
}

export type ShipAction = "ship" | "deploy" | "rollback";

export interface AuthResult {
  authorized: boolean;
  reason?: string;
}

export interface AuthProvider {
  authorize(user: User, action: ShipAction): Promise<AuthResult>;
}

export interface MockAuthConfig {
  allowedRoles?: Record<ShipAction, string[]>;
  allowedUsers?: string[];
}

const DEFAULT_ROLE_PERMISSIONS: Record<ShipAction, string[]> = {
  ship: ["admin", "developer"],
  deploy: ["admin"],
  rollback: ["admin"],
};

export class MockAuthProvider implements AuthProvider {
  private allowedRoles: Record<ShipAction, string[]>;
  private allowedUsers: Set<string>;

  constructor(config: MockAuthConfig = {}) {
    this.allowedRoles = config.allowedRoles ?? DEFAULT_ROLE_PERMISSIONS;
    this.allowedUsers = new Set(config.allowedUsers ?? []);
  }

  async authorize(user: User, action: ShipAction): Promise<AuthResult> {
    if (this.allowedUsers.has(user.id)) {
      return { authorized: true };
    }

    const requiredRoles = this.allowedRoles[action] ?? [];
    const hasRole = user.roles.some((role) => requiredRoles.includes(role));

    if (hasRole) {
      return { authorized: true };
    }

    return {
      authorized: false,
      reason: `User lacks required role for action '${action}'. Required: ${requiredRoles.join(", ")}`,
    };
  }
}
