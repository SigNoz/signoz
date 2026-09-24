// Mock factory for suites that need `useSafeNavigate` to navigate for real.
//
// `jest.config.ts` maps every `hooks/useSafeNavigate` import to the no-op
// `__tests__/safeNavigateMock.ts`, so a suite that drives navigation has to opt
// out with its own `jest.mock`.
//
// In production `safeNavigate` goes through `createBrowserHistory`, which writes
// `window.location` as well as notifying the router. `MemoryRouter` never touches
// `window`, so anything reading `getUnstableCurrentSearchParams()` sees an empty
// search and drops the params the test just navigated with. This mock writes both.
//
// The `jest.mock` factory is hoisted above imports, so require it inside:
//
//   jest.mock('hooks/useSafeNavigate', () =>
//     jest
//       .requireActual('tests/browser-history-safe-navigate')
//       .createBrowserHistorySafeNavigateMock(),
//   );

import type { History } from 'history';

interface SafeNavigateOptions {
	replace?: boolean;
}

interface UseSafeNavigateModule {
	useSafeNavigate: () => {
		safeNavigate: (to: string, options?: SafeNavigateOptions) => void;
	};
}

export function createBrowserHistorySafeNavigateMock(): UseSafeNavigateModule {
	const { useHistory } = jest.requireActual<{ useHistory: () => History }>(
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
