# ShipKit Test Bench

A Next.js application for testing ShipKit's AI-powered feature generation.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or next available port if 3000 is busy).

## Features

- **Component Discovery**: Click "Discover" to auto-detect components in `src/components`
- **Feature Generation**: Describe a feature, and ShipKit generates code using discovered components
- **Live Preview**: See the generated UI rendered in a sandboxed iframe canvas
- **Code View**: Switch to code tab to inspect the generated source
- **Auth Testing**: Configure test users with different roles to test authorization

## Auth Testing

The test bench supports simulating different user roles:

| Role | Permissions |
|------|-------------|
| `admin` | ship, deploy, rollback |
| `developer` | ship |
| `viewer` | none |

Use the "Test User" card in the sidebar to set a user. When a user is configured, the `/api/ship` endpoint enforces authorization via `MockAuthProvider`.

## AI Provider

By default, uses a mock AI provider that generates placeholder components.

To use OpenAI, set the environment variable:

```bash
OPENAI_API_KEY=sk-... npm run dev
```

## Test Components

The test bench includes these components for ShipKit to discover:

- `Button` - Customizable button with variants, sizes, loading state
- `Card` - Container with header, title, content slots
- `Input` - Form input with label, error, helper text
- `Modal` - Dialog overlay with close handling
- `Textarea` - Multi-line input with label support

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/discover` | GET | Discovers components in `src/components` |
| `/api/ship` | POST | Generates features (accepts `user` object for auth) |
| `/api/user` | GET/POST/DELETE | Manage test user state |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── discover/   # Component discovery endpoint
│   │   ├── ship/       # Feature generation endpoint
│   │   └── user/       # User management for auth testing
│   └── page.tsx        # Main UI
└── components/         # Test components for discovery
```
