import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';

import { makeView } from '../../__tests__/savedViewsTestUtils';
import { getSavedViewPath } from '../getSavedViewPath';

const view = makeView({ id: 'view-1', displayName: 'Errors' });

function paramsOf(path: string): URLSearchParams {
	return new URL(path, window.location.origin).searchParams;
}

describe('getSavedViewPath', () => {
	it('opens the view on the given explorer in the given time range', () => {
		const path = getSavedViewPath(
			ROUTES.TRACES_EXPLORER,
			view,
			'startTime=1700000000000&endTime=1700003600000',
		);
		const params = paramsOf(path);

		expect(path.startsWith(`${ROUTES.TRACES_EXPLORER}?`)).toBe(true);
		expect(params.get(QueryParams.viewKey)).toBe(JSON.stringify(view.id));
		expect(params.get(QueryParams.startTime)).toBe('1700000000000');
		expect(params.get(QueryParams.endTime)).toBe('1700003600000');
	});

	it('adds no time range when there is none', () => {
		const path = getSavedViewPath(ROUTES.TRACES_EXPLORER, view, '');

		expect(path.endsWith('&')).toBe(false);
		expect(paramsOf(path).has(QueryParams.relativeTime)).toBe(false);
	});
});
