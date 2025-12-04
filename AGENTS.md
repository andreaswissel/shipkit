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

## E2E Testing (test-bench)

The `test-bench/` directory contains a Next.js app for testing ShipKit end-to-end.

```bash
cd test-bench
npm run dev           # Start dev server on http://localhost:3000
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Run Playwright in UI mode
```

### Playwright MCP Integration

Use the `@playwright/mcp` server for browser automation and testing:

```json
// ~/.amp/mcp.json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

When testing UI output:
1. Start the dev server: `cd test-bench && npm run dev`
2. Use Playwright MCP to navigate to `http://localhost:3000`
3. Interact with the UI: fill forms, click buttons, take screenshots
4. Screenshots are saved to `test-bench/e2e/screenshots/`

### Bug Fix Verification (REQUIRED)

**After fixing any bug, always verify the fix using Playwright MCP:**

1. Run `npm run build` and `npm test` to ensure code compiles and unit tests pass
2. Start the test-bench dev server
3. Use Playwright MCP to:
   - Navigate to the test-bench app
   - Fill in the feature form (Feature Name, Description, Requirements)
   - Click Generate
   - Verify the Status shows "✓ Success!" with no validation errors/warnings
   - Verify the Preview iframe renders the component correctly (no runtime errors)
   - Test component interactivity (click buttons, fill inputs)
4. Close the browser and stop the dev server

This ensures both the library code AND the end-to-end user experience work correctly.

### Environment Variables

Create `test-bench/.env.local` for API keys:
```
OPENAI_API_KEY=your-key-here
```

## Architecture Decisions

- **Provider-agnostic AI**: `AIProvider` interface allows any LLM
- **Pluggable auth**: `AuthProvider` interface for custom auth
- **Pluggable flags**: `FeatureFlagProvider` interface for LaunchDarkly, etc.
- **Pluggable pipeline**: `Pipeline` interface for GitLab, etc.
- **No heavy AST deps**: Discovery uses regex parsing (keep lightweight)
