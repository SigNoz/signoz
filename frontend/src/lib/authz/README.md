# AuthZ

Permission-based authorization system for SigNoz frontend.

## Supported Resources

See [hooks/useAuthZ/permissions.type.ts](./hooks/useAuthZ/permissions.type.ts) for available resources and verbs.

If your page/content represents a resource not listed there, skip authz implementation — the backend doesn't enforce it yet.

## UI Gating

Need to gate UI based on permissions? See [components/README.md](./components/README.md).

Covers: AuthZButton, AuthZTooltip, withAuthZ*, AuthZGuard*, when to use each.

## Testing

Need to test authz behavior? See [utils/README.md](./utils/README.md).

Covers: MSW handlers, mock hooks, test patterns.
