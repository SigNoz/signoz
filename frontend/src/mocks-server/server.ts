import { rest, setupWorker } from 'msw';

import { handlers } from './handlers';

// Browser mode runs the tests inside a real page, where `msw/node` cannot
// intercept. `setupWorker` exposes the same `use` and `resetHandlers` surface
// the suites call; only the bootstrap in `vitest.setup.ts` differs.
export const server = setupWorker(...handlers);

export * from './utils';

export { rest };
