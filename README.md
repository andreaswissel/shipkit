<p align="center">
  <img src="cover.jpg" alt="Cover image" width="640" /><br>
</p>


# shipkit

AI-powered frontend feature shipping engine. What if your software could ship software?

## Features

- **AI-Powered Code Generation** - Describe features in plain English, get production-ready code
- **Component Discovery** - Auto-discover existing components in your codebase
- **Multi-Provider** - Works with OpenAI, Anthropic, or bring your own LLM
- **Feature Flags** - Deploy features behind flags for safe rollouts
- **GitHub Integration** - Create branches, PRs, and trigger deployments
- **Validation** - Syntax checking and linting before code is written
- **Auth Layer** - Role-based access control for who can ship

## Install

```bash
npm install @andreaswissel/shipkit@latest
```

## Quick Start

```typescript
import { createShipKit, OpenAIProvider } from "shipkit";

const kit = createShipKit({
  framework: "react",
  componentsDir: "./src/components",
  outputDir: "./src/features",
  style: { cssFramework: "tailwind" },
  aiProvider: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
});

// Auto-discover existing components
import { ComponentDiscovery } from "shipkit";
const discovery = new ComponentDiscovery({
  directory: "./src/components",
  framework: "react",
});
const components = await discovery.discover();
kit.registerComponents(components);

// Ship a feature
const result = await kit.ship({
  name: "UserProfileCard",
  description: "A card showing user avatar, name, and bio",
  requirements: [
    "Display user avatar as a circular image",
    "Show user name and short bio",
    "Include a follow button",
  ],
});

if (result.success) {
  console.log("Feature shipped!", result.files);
}
```

## Architecture

```
src/
├── shipkit.ts       # Main engine - orchestrates the shipping flow
├── registry.ts      # Component registry for discovery
├── discovery.ts     # Auto-discover components from codebase
├── writer.ts        # Write generated code to disk
├── validator.ts     # Validate generated code syntax
├── auth.ts          # Role-based authorization
├── flags.ts         # Feature flag providers
├── pipeline.ts      # GitHub Actions integration
├── types.ts         # Core type definitions
└── providers/
    ├── openai.ts    # OpenAI provider
    └── anthropic.ts # Anthropic provider
```

## Core Concepts

### FeatureSpec

Describe what you want to build:

```typescript
interface FeatureSpec {
  name: string;
  description: string;
  requirements: string[];
  acceptanceCriteria?: string[];
}
```

### Component Registry

Register your existing UI components so the AI knows what's available:

```typescript
kit.registerComponent({
  id: "card",
  name: "Card",
  description: "Container with shadow and rounded corners",
  props: [{ name: "children", type: "ReactNode", required: true }],
  source: "@/components/ui/Card",
  framework: "react",
});
```

### AI Providers

Built-in providers for OpenAI and Anthropic:

```typescript
import { OpenAIProvider, AnthropicProvider } from "shipkit";

// OpenAI (default: gpt-4o)
const openai = new OpenAIProvider({ 
  apiKey: "sk-...",
  model: "gpt-4o" // optional
});

// Anthropic (default: claude-sonnet-4-20250514)
const anthropic = new AnthropicProvider({
  apiKey: "sk-ant-...",
  model: "claude-sonnet-4-20250514" // optional
});
```

Or bring your own:

```typescript
const customProvider: AIProvider = {
  name: "my-llm",
  async generate(prompt, context) {
    return await myLLM.complete(prompt);
  },
};
```

### Feature Flags

Deploy features behind flags:

```typescript
import { InMemoryFlagProvider, FileFlagProvider } from "shipkit";

// In-memory (for testing)
const flags = new InMemoryFlagProvider();

// File-based (for simple deployments)
const flags = new FileFlagProvider("./flags.json");

await flags.createFlag("user-profile-card", {
  description: "New user profile card component",
  defaultEnabled: false,
  rolloutPercentage: 10, // 10% of users
});
```

### GitHub Pipeline

Automate PR creation and deployments:

```typescript
import { GitHubPipeline } from "shipkit";

const pipeline = new GitHubPipeline({
  token: process.env.GITHUB_TOKEN,
  owner: "myorg",
  repo: "myapp",
});

await pipeline.createBranch("feature/user-profile-card");
await pipeline.commit(result.files, "feat: add UserProfileCard component");
await pipeline.createPullRequest({
  title: "feat: UserProfileCard",
  body: "AI-generated feature",
  base: "main",
  head: "feature/user-profile-card",
});
```

### Authorization

Control who can ship:

```typescript
import { MockAuthProvider } from "shipkit";

const auth = new MockAuthProvider({
  roles: {
    admin: ["ship", "deploy", "rollback"],
    developer: ["ship"],
  },
});

const result = await auth.authorize(
  { id: "1", email: "dev@example.com", roles: ["developer"] },
  "ship"
);
// { authorized: true }
```

## Supported Frameworks

- React
- Vue
- Svelte
- Solid
- Angular
- Vanilla JS

## Development

```bash
npm install
npm run build
npm test
```

### Test Bench

A Next.js app for testing ShipKit interactively:

```bash
cd test-bench
npm install
npm run dev
```

Open http://localhost:3000 to:
- Discover components from your codebase
- Describe features in natural language
- See generated code with live preview

## License

MIT © Andreas Wissel
