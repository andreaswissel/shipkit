# ShipKit Roadmap

## In Progress

- [ ] Wire up unified `ShipKit.ship()` flow (auth → generate → validate → write → PR → flag)

## Next Up: Component Discovery Enhancements

### Storybook Integration
- [ ] Parse `.stories.tsx` / `.stories.js` files
- [ ] Extract component metadata from story exports
- [ ] Pull argTypes for prop definitions
- [ ] Support CSF (Component Story Format) 3.0
- [ ] Extract description from story docs

### Angular Libraries
- [ ] Discover components in `ng-package.json` libraries
- [ ] Parse `@Component` decorator metadata
- [ ] Extract `@Input()` and `@Output()` as props
- [ ] Handle Angular standalone components
- [ ] Support Angular Material / CDK patterns

### Next.js Component Libraries
- [ ] Discover components in `components/` directory conventions
- [ ] Parse `"use client"` / `"use server"` directives
- [ ] Handle Next.js Image, Link, and other built-in components
- [ ] Support Radix UI / shadcn patterns common in Next.js projects
- [ ] Extract props from `ComponentProps<typeof X>` patterns

## Future

- [ ] LaunchDarkly feature flag provider
- [ ] GitLab pipeline integration
- [ ] Bitbucket pipeline integration
- [ ] Real auth providers (Auth0, Clerk, etc.)
- [ ] Web UI for feature descriptions
- [ ] Rollback support for generated features
- [ ] Diff preview before writing files
- [ ] Integration tests with real AI providers
