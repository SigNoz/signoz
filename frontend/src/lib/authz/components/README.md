# AuthZ Components

Quick reference for permission-gating UI. All components use AND semantics: user needs ALL permissions in `checks` array.

## Decision Tree

```
Need to gate...
├── A button? → AuthZButton
├── Any element with tooltip on deny? → AuthZTooltip
├── A section inside a page? → withAuthZContent (preferred)
│   └── Need JSX wrapper? → AuthZGuardContent
├── An entire page/route? → withAuthZPage (preferred)
│   └── Need JSX wrapper? → AuthZGuardPage
├── Need full control over fallback? → withAuthZ / AuthZGuard
└── None of above fit?
    ├── Can create wrapper component? → Create it (like AuthZButton)
    └── Last resort → useAuthZ hook directly
```

## Building Permissions

Use `buildPermission`, `buildObjectString` or pre-built constants. Never cast with `as BrandedPermission`.

```tsx
import { buildPermission, buildObjectString } from 'lib/authz/hooks/useAuthZ/utils';
import { 
  RoleCreatePermission,
  buildRoleReadPermission 
} from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';

// Static permission (pre-built)
const checks = [RoleCreatePermission];

// Dynamic permission (builder fn)
const checks = [buildRoleReadPermission(roleId)];

// Custom permission (buildPermission + buildObjectString)
const checks = [buildPermission('read', buildObjectString('dashboard', dashboardId))];
```

## Creating Permission Helpers

When adding authz to a new resource, create a permissions file under `lib/authz/hooks/useAuthZ/permissions/`.

```tsx
// lib/authz/hooks/useAuthZ/permissions/dashboard.permissions.ts
import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Collection-level — wildcard, no specific id needed
export const DashboardCreatePermission = buildPermission('create', 'dashboard:*');
export const DashboardListPermission = buildPermission('list', 'dashboard:*');

// Resource-level — require specific id
export const buildDashboardReadPermission = (id: string): BrandedPermission =>
  buildPermission('read', `dashboard:${id}`);
export const buildDashboardUpdatePermission = (id: string): BrandedPermission =>
  buildPermission('update', `dashboard:${id}`);
export const buildDashboardDeletePermission = (id: string): BrandedPermission =>
  buildPermission('delete', `dashboard:${id}`);
```

Pattern:
- `<Resource><Action>Permission` → collection-level const (wildcard `*`)
- `build<Resource><Action>Permission(id)` → resource-level fn (specific id)

## Components

### AuthZButton

Button that disables + shows tooltip when denied.

```tsx
import { SACreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/service-account.permissions';

<AuthZButton checks={[SACreatePermission]} onClick={handleCreate}>
  Create
</AuthZButton>
```

### AuthZTooltip

Wraps any element. Disables child + shows denial tooltip.

```tsx
import { buildSADeletePermission } from 'lib/authz/hooks/useAuthZ/permissions/service-account.permissions';

<AuthZTooltip checks={[buildSADeletePermission(accountId)]}>
  <IconButton icon={<Trash />} onClick={handleDelete} />
</AuthZTooltip>
```

### withAuthZPage (preferred for pages)

HOC for route-level gating. Wrap at export. Shows `PermissionDeniedFullPage` + `AppLoading`.

```tsx
import { RoleListPermission } from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';

function RolesPage(): JSX.Element {
  return <div>...</div>;
}

export default withAuthZPage(RolesPage, {
  checks: [RoleListPermission],
});
```

### withAuthZContent (preferred for sections)

HOC for inline sections. Shows `PermissionDeniedCallout` on deny.

```tsx
import { buildRoleReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';

function RoleEditor(): JSX.Element {
  return <div>...</div>;
}

// Dynamic checks from route params
export default withAuthZContent(RoleEditor, {
  checks: (_props, ctx) => [buildRoleReadPermission(ctx.params.roleId)],
});
```

### withAuthZ

HOC base. No default fallback. Use when you need custom fallback.

```tsx
import { buildPermission } from 'lib/authz/hooks/useAuthZ/utils';

export default withAuthZ(SecretPanel, {
  checks: [buildPermission('write', 'settings:org')],
  fallback: <p>No access</p>,
});
```

### AuthZGuardPage

JSX variant of `withAuthZPage`. Use when HOC not possible (conditional rendering).

```tsx
import { RoleListPermission } from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';

<AuthZGuardPage checks={[RoleListPermission]}>
  <RolesPage />
</AuthZGuardPage>
```

### AuthZGuardContent

JSX variant of `withAuthZContent`. Use when HOC not possible.

```tsx
import { RoleCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';

<AuthZGuardContent checks={[RoleCreatePermission]}>
  <RoleEditor />
</AuthZGuardContent>
```

### AuthZGuard

JSX base guard. No default fallback. Use when you need custom fallback in JSX.

```tsx
import { buildPermission } from 'lib/authz/hooks/useAuthZ/utils';

<AuthZGuard
  checks={[buildPermission('write', 'settings:org')]}
  fallback={<p>No access</p>}
  fallbackOnLoading={<Spinner />}
>
  <SecretContent />
</AuthZGuard>
```

## Fallback Components

Don't use these components directly, always prefer using via `withAuthZ` and their variants.

- PermissionDeniedCallout: inline error callout. Shows `user/{id} is not authorized to perform {permissions}`.
- PermissionDeniedFullPage: full-page centered error. Same message, bigger presentation.
