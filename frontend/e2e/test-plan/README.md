# SigNoz E2E Test Plan

This directory contains the structured test plan for the SigNoz application. Each subfolder corresponds to a main module or feature area, and contains scenario files for all user journeys, edge cases, and cross-module flows. These documents serve as the basis for generating Playwright MCP-driven E2E tests.

## Structure

- Each main module (e.g., logs, traces, dashboards, alerts, settings, etc.) has its own folder or markdown file.
- Each file contains detailed scenario templates, including preconditions, step-by-step actions, and expected outcomes.
- Use these documents to write, review, and update test cases as the application evolves.

## Folders & Files

- `logs/` — Logs module scenarios
- `traces/` — Traces module scenarios
- `metrics/` — Metrics module scenarios
- `dashboards/` — Dashboards module scenarios
- `alerts/` — Alerts module scenarios
- `services/` — Services module scenarios
- `settings/` — Settings and all sub-settings scenarios
- `onboarding/` — Onboarding and signup flows
- `navigation/` — Navigation, sidebar, and cross-module flows
- `exceptions/` — Exception and error handling scenarios
- `external-apis/` — External API monitoring scenarios
- `messaging-queues/` — Messaging queue scenarios
- `infrastructure/` — Infrastructure monitoring scenarios
- `help-support/` — Help & support scenarios
- `user-preferences/` — User preferences and personalization scenarios
- `service-map/` — Service map scenarios
- `saved-views/` — Saved views scenarios
