# AuthZ Test Utilities

Helpers for testing permission-gated components.

## File Naming

AuthZ tests live in `*.authz.test.tsx` files alongside other test files:

```
ComponentName/
├── ComponentName.tsx
├── __tests__/
│   ├── ComponentName.test.tsx        # functional tests
│   └── ComponentName.authz.test.tsx  # permission tests
```

## Test Structure

```tsx
import { server } from 'mocks-server/server';
import { setupAuthzAdmin, setupAuthzDenyAll } from 'lib/authz/utils/authz-test-utils';
import { render, screen, waitFor } from 'tests/test-utils';

describe('ComponentName - AuthZ', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    server.resetHandlers();  // reset MSW handlers after each test
  });

  describe('permission denied', () => {
    it('shows permission denied when read denied', async () => {
      server.use(setupAuthzDenyAll());

      render(<ComponentName />);

      await expect(
        screen.findByText(/not authorized/i),
      ).resolves.toBeInTheDocument();
    });
  });

  describe('permission granted', () => {
    it('renders content when permitted', async () => {
      server.use(setupAuthzAdmin());

      render(<ComponentName />);

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });
    });
  });
});
```

Key points:
- Use `server.use()` at start of each test (not `beforeEach`) for explicit setup
- Call `server.resetHandlers()` in `afterEach` to avoid test pollution
- Use `waitFor` or `findBy*` queries since authz checks are async
- Group tests by permission scenario: denied, granted, partial, loading

## MSW Handlers

Mock `/api/v1/authz/check` endpoint responses.

```tsx
import { server } from 'mocks-server/server';
import {
  setupAuthzAdmin,
  setupAuthzDenyAll,
  setupAuthzDeny,
  setupAuthzAllow,
  setupAuthzGrantByPrefix,
} from 'lib/authz/utils/authz-test-utils';

// Grant all permissions
server.use(setupAuthzAdmin());

// Deny all permissions
server.use(setupAuthzDenyAll());

// Grant all except specific permissions
server.use(setupAuthzDeny(RoleCreatePermission, RoleDeletePermission));

// Deny all except specific permissions
server.use(setupAuthzAllow(RoleListPermission));

// Grant by relation prefix (e.g., grant read/delete, deny update)
server.use(setupAuthzGrantByPrefix('read', 'delete'));
```

## Custom Mock Response

For fine-grained control over responses.

```tsx
import { rest } from 'msw';
import { AUTHZ_CHECK_URL, authzMockResponse } from 'lib/authz/utils/authz-test-utils';

server.use(
  rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
    const payload = await req.json();
    // [true, false] = first permission granted, second denied
    return res(ctx.status(200), ctx.json(authzMockResponse(payload, [true, false])));
  }),
);
```

## Testing Loading State

Use `ctx.delay('infinite')` to hold response indefinitely:

```tsx
it('shows skeleton while checking permissions', () => {
  server.use(
    rest.post(AUTHZ_CHECK_URL, (_req, res, ctx) =>
      res(ctx.delay('infinite')),
    ),
  );

  render(<ComponentName />);

  expect(document.querySelector('.ant-skeleton')).toBeInTheDocument();
});
```
