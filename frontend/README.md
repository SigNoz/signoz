<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../docs/readme-assets/signoz-hero-dark.png" width="700">
    <source media="(prefers-color-scheme: light)" srcset="../docs/readme-assets/signoz-hero-light.png" width="700">
    <img alt="SigNoz - Observability on Your Terms" src="../docs/readme-assets/signoz-hero-light.png" width="700">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/SigNoz/signoz/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/SigNoz/signoz"></a>
  <a href="https://signoz.io/slack"><img alt="Slack community" src="https://img.shields.io/badge/slack-community-4A154B?logo=slack&logoColor=white"></a>
</p>

# SigNoz Frontend

React-based web interface for [SigNoz](https://signoz.io), the open-source observability platform.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **State:** React Query, Zustand, Redux Toolkit (legacy)
- **Styling:** CSS Modules, Ant Design (legacy)
- **Charts:** uPlot
- **Testing:** Jest

## Local Development Setup

1. Run SigNoz backend locally — see [Self-Host Docs](https://signoz.io/docs/install/self-host/)

2. Configure environment:
   ```bash
   cp example.env .env
   ```
   
   Key variables in `.env`:
   ```bash
   # Backend API endpoint (required)
   VITE_FRONTEND_API_ENDPOINT="http://localhost:8080"
   
   # Enable bundle analyzer (optional)
   BUNDLE_ANALYSER="true"
   ```

3. Install and run:
   ```bash
   pnpm install
   pnpm dev
   ```

## Development

```bash
pnpm dev
```

Opens [http://localhost:3301](http://localhost:3301).

## Build

```bash
pnpm build
```

Output in `build/` folder.

## Bundle Size Analysis

Set in `.env`:
```bash
BUNDLE_ANALYSER="true"
```

Then run build:
```bash
pnpm build
```

Opens bundle analyzer visualization automatically.

## Testing

```bash
# Unit tests
pnpm test

# Type checking
pnpm tsgo --noEmit
```

## Linting

```bash
# Run all linters (oxlint + stylelint)
pnpm lint
```

## Project Structure

```
src/
├── api/          # API clients and react-query hooks
├── components/   # Shared UI components
├── container/    # Page-level containers
├── hooks/        # Custom React hooks
├── pages/        # Route pages
├── providers/    # React context providers
├── store/        # Redux store
└── types/        # TypeScript definitions
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the root repo.

Questions? Join our [Slack community](https://signoz.io/slack).
