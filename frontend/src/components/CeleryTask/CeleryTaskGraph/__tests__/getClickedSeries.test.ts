import { getClickedSeries } from '../CeleryTaskGraphUtils';

const focused = { queryName: 'A', inFocusOrNot: true };
const unfocused = { queryName: '', inFocusOrNot: false };

describe('getClickedSeries', () => {
	it('returns the clicked series label', () => {
		expect(
			getClickedSeries(
				{ 'celery.state': 'RETRY', clickedTimestamp: '1700000000' },
				focused,
			),
		).toStrictEqual({ entity: 'celery.state', value: 'RETRY' });
	});

	it('ignores a click outside any series', () => {
		expect(
			getClickedSeries({ clickedTimestamp: '1700000000' }, unfocused),
		).toBeUndefined();
	});

	it('ignores a series that has no label', () => {
		expect(
			getClickedSeries({ clickedTimestamp: '1700000000' }, focused),
		).toBeUndefined();
	});
});
