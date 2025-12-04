import { NextResponse } from "next/server";
import { ComponentDiscovery } from "shipkit";
import path from "path";

export async function GET() {
  try {
    const componentsDir = path.join(process.cwd(), "src/components");
    
    const discovery = new ComponentDiscovery({
      directory: componentsDir,
      framework: "react",
      extensions: [".tsx"],
    });

    const components = await discovery.discover();
    
    return NextResponse.json({
      success: true,
      components: components.map((c) => c.name),
      details: components.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        props: c.props,
        source: c.source,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        components: [],
      },
      { status: 500 }
    );
  }
}
