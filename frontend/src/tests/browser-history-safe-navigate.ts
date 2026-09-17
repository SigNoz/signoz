// Mock factory for suites that need `useSafeNavigate` to navigate for real.
//
// `vitest.config.ts` maps every `hooks/useSafeNavigate` import to the no-op
// `__tests__/safeNavigateMock.ts`, so a suite that drives navigation has to opt
// out with its own `vi.mock`.
//
// In production `safeNavigate` goes through `createBrowserHistory`, which writes
// `window.location` as well as notifying the router. `MemoryRouter` never touches
// `window`, so anything reading `getUnstableCurrentSearchParams()` sees an empty
// search and drops the params the test just navigated with. This mock writes both.
//
// The `vi.mock` factory is hoisted above imports, so import it inside:
//
//   vi.mock('hooks/useSafeNavigate', async () => {
//     const { createBrowserHistorySafeNavigateMock } = await vi.importActual<
//       typeof import('tests/browser-history-safe-navigate')
//     >('tests/browser-history-safe-navigate');
//     return createBrowserHistorySafeNavigateMock();
//   });

import type { History } from 'history';

interface SafeNavigateOptions {
	replace?: boolean;
}

interface UseSafeNavigateModule {
	useSafeNavigate: () => {
		safeNavigate: (to: string, options?: SafeNavigateOptions) => void;
	};
}

export async function createBrowserHistorySafeNavigateMock(): Promise<UseSafeNavigateModule> {
	const { useHistory } = await vi.importActual<{ useHistory: () => History }>(
		'react-router-dom',
	);

	return {
		useSafeNavigate: () => {
			const history = useHistory();

			return {
				safeNavigate: (to: string, options?: SafeNavigateOptions): void => {
					if (options?.replace) {
						window.history.replaceState(null, '', to);
						history.replace(to);
					} else {
						window.history.pushState(null, '', to);
						history.push(to);
					}
				},
			};
		},
	};
}
