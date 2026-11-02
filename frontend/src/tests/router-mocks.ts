// Spies on the `lib/router` facade, for tests that cannot render at a route or
// assert the navigation call itself. Tests never mock the router packages or
// `lib/history`: those change at a router upgrade, the facade does not.
// Spies last for the rest of the file unless restored.

import * as navigation from 'lib/router/navigation';
import type { AppLocation, AppParams, NavigateFn } from 'lib/router/types';
import * as useAppLocationModule from 'lib/router/useAppLocation';
import * as useAppNavigateModule from 'lib/router/useAppNavigate';
import * as useAppParamsModule from 'lib/router/useAppParams';

export function mockAppLocation(
	location: Partial<AppLocation> = {},
): jest.SpyInstance {
	return jest.spyOn(useAppLocationModule, 'useAppLocation').mockReturnValue({
		pathname: '/',
		search: '',
		hash: '',
		state: undefined,
		...location,
	});
}

export function mockAppParams(params: AppParams): jest.SpyInstance {
	return jest
		.spyOn(useAppParamsModule, 'useAppParams')
		.mockReturnValue(
			params as ReturnType<typeof useAppParamsModule.useAppParams>,
		);
}

/** Replaces the function `useAppNavigate()` returns, and returns it. */
export function mockAppNavigate(): jest.MockedFunction<NavigateFn> {
	const navigate = jest.fn() as jest.MockedFunction<NavigateFn>;
	jest.spyOn(useAppNavigateModule, 'useAppNavigate').mockReturnValue(navigate);
	return navigate;
}

/** Stubs the module-level `navigate()`, so the call is recorded and the URL stays put. */
export function mockNavigate(): jest.SpyInstance<
	ReturnType<typeof navigation.navigate>,
	Parameters<typeof navigation.navigate>
> {
	return jest.spyOn(navigation, 'navigate').mockImplementation(() => {});
}
