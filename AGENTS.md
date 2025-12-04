# ShipKit - Agent Guidelines

## Commands

```bash
npm run build    # Compile TypeScript
npm run check    # Type-check without emitting
npm test         # Run vitest tests
npm run dev      # Watch mode for development
```

## Project Structure

```
src/
├── index.ts         # Public exports
├── types.ts         # Core type definitions
├── shipkit.ts       # Main ShipKit engine
├── registry.ts      # Component registry
├── discovery.ts     # Component auto-discovery
├── writer.ts        # File writer
├── validator.ts     # Code validation
├── auth.ts          # Authorization layer
├── flags.ts         # Feature flag providers
├── pipeline.ts      # GitHub Actions integration
├── providers/       # AI provider implementations
│   ├── openai.ts
│   ├── anthropic.ts
│   └── index.ts
└── __fixtures__/    # Test fixtures
```

## Code Style

- ESM modules with `.js` extensions in imports
- Strict TypeScript
- No comments unless code is complex
- Export types separately from implementations
- Interfaces over type aliases for extensibility

## Testing

- Use vitest
- Test files colocated: `*.test.ts` next to source
- Use temp directories for filesystem tests
- Clean up after tests in `afterEach`/`afterAll`

## Architecture Decisions

- **Provider-agnostic AI**: `AIProvider` interface allows any LLM
- **Pluggable auth**: `AuthProvider` interface for custom auth
- **Pluggable flags**: `FeatureFlagProvider` interface for LaunchDarkly, etc.
- **Pluggable pipeline**: `Pipeline` interface for GitLab, etc.
- **No heavy AST deps**: Discovery uses regex parsing (keep lightweight)
