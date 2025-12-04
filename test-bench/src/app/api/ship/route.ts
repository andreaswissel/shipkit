import { NextRequest, NextResponse } from "next/server";
import {
  createShipKit,
  ComponentDiscovery,
  MockAuthProvider,
  type FeatureSpec,
  type AIProvider,
  type AIContext,
  type User,
} from "shipkit";
import path from "path";

class MockAIProvider implements AIProvider {
  name = "mock";

  async generate(prompt: string, context: AIContext): Promise<string> {
    const componentNames = context.components.map((c) => c.name);
    
    const featureNameMatch = prompt.match(/## Feature: (.+)/);
    const featureName = featureNameMatch?.[1] || "Feature";
    const fileName = featureName.replace(/\s+/g, "");

    return JSON.stringify({
      components: [
        {
          name: fileName,
          path: `src/features/${fileName}.tsx`,
          code: this.generateMockComponent(featureName, componentNames, prompt),
          usedComponents: componentNames,
        },
      ],
      entryPoint: `src/features/${fileName}.tsx`,
      dependencies: [],
    });
  }

  private generateMockComponent(
    name: string,
    availableComponents: string[],
    prompt: string
  ): string {
    const requirementsMatch = prompt.match(/## Requirements:\n([\s\S]*?)(?=\n##|$)/);
    const requirements = requirementsMatch?.[1]
      .split("\n")
      .filter((r) => r.trim().startsWith("-"))
      .map((r) => r.replace(/^-\s*/, "").trim()) || [];

    const usedComps = availableComponents.filter(
      (c) => c !== "CardHeader" && c !== "CardTitle" && c !== "CardContent"
    );

    const imports = usedComps.length > 0
      ? `import { ${usedComps.join(", ")} } from "@/components";\n`
      : "";

    return `"use client";

${imports}import { useState } from "react";

export function ${name.replace(/\s+/g, "")}() {
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "16px" }}>
        ${name}
      </h1>
      
      {/* Requirements:
${requirements.map((r) => `         - ${r}`).join("\n")}
      */}
      
${usedComps.includes("Card") ? `      <Card variant="outlined" padding="lg">
        <p style={{ color: "#888" }}>
          This is a generated feature component.
        </p>
${usedComps.includes("Button") ? `        <Button onClick={() => setLoading(!loading)} loading={loading}>
          Toggle Loading
        </Button>` : ""}
      </Card>` : `      <div style={{ padding: "20px", border: "1px solid #333", borderRadius: "8px" }}>
        <p style={{ color: "#888" }}>
          This is a generated feature component.
        </p>
      </div>`}
    </div>
  );
}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body.name !== "string" || typeof body.description !== "string") {
      return NextResponse.json(
        {
          success: false,
          files: [],
          errors: ["'name' and 'description' must be strings"],
        },
        { status: 400 }
      );
    }
    
    const spec: FeatureSpec = {
      name: body.name,
      description: body.description,
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      acceptanceCriteria: Array.isArray(body.acceptanceCriteria)
        ? body.acceptanceCriteria
        : undefined,
    };

    const user: User | undefined = body.user ? {
      id: body.user.id,
      email: body.user.email,
      roles: body.user.roles || [],
    } : undefined;

    const componentsDir = path.join(process.cwd(), "src/components");
    const outputDir = path.join(process.cwd(), "src/generated");

    const discovery = new ComponentDiscovery({
      directory: componentsDir,
      framework: "react",
      extensions: [".tsx"],
    });

    const components = await discovery.discover();

    const aiProvider = process.env.OPENAI_API_KEY
      ? await getOpenAIProvider()
      : new MockAIProvider();

    const authProvider = user ? new MockAuthProvider() : undefined;

    const shipkit = createShipKit({
      framework: "react",
      componentsDir,
      outputDir,
      style: { cssFramework: "vanilla" },
      aiProvider,
      authProvider,
    });

    shipkit.registerComponents(components);

    const result = await shipkit.ship(spec, {
      validate: true,
      write: false,
      dryRun: true,
    }, user);

    return NextResponse.json({
      success: result.success,
      files: result.files,
      errors: result.errors,
      validation: result.validation,
      components: components.map((c) => c.name),
      user: user ? { id: user.id, roles: user.roles } : null,
    });
  } catch (error) {
    console.error("Ship error:", error);
    return NextResponse.json(
      {
        success: false,
        files: [],
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 }
    );
  }
}

async function getOpenAIProvider(): Promise<AIProvider> {
  const { OpenAIProvider } = await import("shipkit");
  return new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "gpt-4o",
  });
}
