import { getRouteKey } from './utils';

jest.mock('constants/routes', () => ({
	ROUTE_TEST_1: '/route-test-1',
	ROUTE_TEST_2: '/route-test-2',
	INSTRUMENTATION: '/get-started',
	CHANNELS_EDIT: '/settings/channels/:id',
	HOME_PAGE: '/',
	LOGIN: '/login',
}));

describe('getRouteKey', () => {
	it('Should return the correct route for all keys for a given pathname', () => {
		const testData = [
			{ pathname: '/route-test-1', expectedKey: 'ROUTE_TEST_1' },
			{ pathname: '/route-test-2', expectedKey: 'ROUTE_TEST_2' },
			{ pathname: '/get-started', expectedKey: 'INSTRUMENTATION' },
			{ pathname: '/settings/channels/:id', expectedKey: 'CHANNELS_EDIT' },
			{ pathname: '/', expectedKey: 'HOME_PAGE' },
			{ pathname: '/login', expectedKey: 'LOGIN' },
			{ pathname: '/unknown', expectedKey: 'DEFAULT' },
			{ pathname: '', expectedKey: 'DEFAULT' },
		];

		testData.forEach(({ pathname, expectedKey }) => {
			const routeKey = getRouteKey(pathname);
			expect(routeKey).toBe(expectedKey);
		});
	});
});
