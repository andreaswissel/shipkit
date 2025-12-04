import { NextRequest, NextResponse } from "next/server";

export interface TestUser {
  id: string;
  email: string;
  roles: string[];
}

let currentUser: TestUser | null = null;

export async function GET() {
  return NextResponse.json({
    user: currentUser,
    availableRoles: ["admin", "developer", "viewer"],
    rolePermissions: {
      admin: ["ship", "deploy", "rollback"],
      developer: ["ship"],
      viewer: [],
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  currentUser = {
    id: body.id || `user-${Date.now()}`,
    email: body.email || "test@example.com",
    roles: body.roles || ["developer"],
  };
  
  return NextResponse.json({ success: true, user: currentUser });
}

export async function DELETE() {
  currentUser = null;
  return NextResponse.json({ success: true, user: null });
}
