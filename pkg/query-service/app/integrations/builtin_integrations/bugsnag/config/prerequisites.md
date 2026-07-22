## Before You Begin

To configure the Bugsnag integration, you need:

- A Bugsnag account with a project reporting errors, and permission to manage that project's integrations
- Access to your SigNoz OpenTelemetry Collector configuration
- A public HTTPS endpoint for the webhook — Bugsnag only delivers to publicly reachable HTTPS URLs, so the Collector port added below must be exposed through your reverse proxy or load balancer with a valid certificate
- A random secret for webhook authentication — Bugsnag webhooks are not signed and cannot carry custom headers, so a secret embedded in the webhook URL path is used instead. Generate one:

```bash
openssl rand -hex 24
```

Use this value wherever `<random-secret>` appears in the next step.
