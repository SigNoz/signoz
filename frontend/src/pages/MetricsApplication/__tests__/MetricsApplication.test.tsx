import ROUTES from 'constants/routes';
import { getCurrentLocation } from 'lib/router/navigation';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import MetricsApplication from '../MetricsApplication';

// The `.ts` extension slips past jest.config.ts's useSafeNavigate mock, so the
// tab click moves the real router.
jest.mock('hooks/useSafeNavigate', () =>
	jest.requireActual('../../../hooks/useSafeNavigate.ts'),
);
jest.mock('container/MetricsApplication/Tabs/Overview', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('container/MetricsApplication/Tabs/DBCall', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('container/MetricsApplication/Tabs/External', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('container/ResourceAttributesFilter', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('../ApDex/ApDexApplication', () => ({
	__esModule: true,
	default: (): null => null,
}));

describe('MetricsApplication', () => {
	it('keeps an encoded slash in the service name when switching tabs', async () => {
		const user = userEvent.setup();
		render(<MetricsApplication />, undefined, {
			initialRoute: '/services/api%2Fworker',
			routePath: ROUTES.SERVICE_METRICS,
		});

		await user.click(screen.getByRole('tab', { name: 'DB Call Metrics' }));

		await waitFor(() => {
			const { pathname, search } = getCurrentLocation();
			expect(pathname).toBe('/services/api%2Fworker');
			expect(new URLSearchParams(search).get('tab')).toBe('DB_CALL_METRICS');
		});
	});
});
