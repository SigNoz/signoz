import type { IAppContext } from 'providers/App/types';

import { render } from './test-utils';

export const NO_AUTH_CONTEXT: Partial<IAppContext> = {
	isNoAuthMode: true,
	isPreflightLoading: false,
};

/**
 * Renders a component with no-auth mode enabled in the app context.
 * Mirrors the authz-test-utils pattern for consistent no-auth test setup.
 */
export function renderWithNoAuth(
	...args: Parameters<typeof render>
): ReturnType<typeof render> {
	const [ui, options, providerProps = {}] = args;
	return render(ui, options, {
		...providerProps,
		appContextOverrides: {
			...providerProps.appContextOverrides,
			...NO_AUTH_CONTEXT,
		},
	});
}
