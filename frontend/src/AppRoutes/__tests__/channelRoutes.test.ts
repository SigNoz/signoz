import ROUTES from 'constants/routes';

import routes from '../routes';

/**
 * The channel form renders inside the alerts page, which owns the tab strip.
 * Pointing these routes at the standalone pages tears that page down on every
 * open and rebuilds it on the way back, which reads as a full reload.
 */
describe('channel routes', () => {
	const findRoute = (key: string): (typeof routes)[number] | undefined =>
		routes.find((route) => route.key === key);

	it('mounts the same component as the alerts list', () => {
		const list = findRoute('LIST_ALL_ALERT');
		const create = findRoute('CHANNELS_NEW');
		const edit = findRoute('CHANNELS_EDIT');

		expect(list?.component).toBeDefined();
		expect(create?.component).toBe(list?.component);
		expect(edit?.component).toBe(list?.component);
	});

	it('keeps the channel paths under /alerts', () => {
		expect(ROUTES.CHANNELS_NEW.startsWith('/alerts')).toBe(true);
		expect(ROUTES.CHANNELS_EDIT.startsWith('/alerts')).toBe(true);
	});
});
