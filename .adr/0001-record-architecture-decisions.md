# Recording Architecture Decisions

## Status

Proposed

## Context

At SigNoz, architecture decisions are stored across internal communication channels, Notion, GitHub Issues, or directly
in PR comments and code.

When we need to understand the reasoning behind a large change or a specific decision in the codebase, finding it is
difficult because we must search across many different places.

## Decision

Instead of storing architecture decisions outside this codebase, we will use the structure proposed
by [ADR](https://github.com/architecture-decision-record/architecture-decision-record).

This is the first decision being stored, alongside [0000-template.md](./0000-template.md) which serves as the template
for new decisions.

The current template is basic and inspired
by [Michael Nygard's template](https://github.com/architecture-decision-record/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md).
Over time, we can improve or change it to better fit our needs.

## Consequences

We can still store internal discussions or private matters in our internal communication channels. However, with this
approach, we have a single place to look for decisions about the codebase.
