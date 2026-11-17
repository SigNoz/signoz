import { ColorRampScale } from 'lib/visualization/colorRamp/types';

import { MAX_ROWS } from '../../constants';
import { group, makeTable, prepare, value } from './prepareGeoMapFixtures';

describe('prepareGeoMapData limits', () => {
	it('counts values the log scale cannot separate', () => {
		const data = prepare(
			makeTable(
				[group('country'), value('A')],
				[
					{ country: 'US', A: 0 },
					{ country: 'DE', A: -2 },
					{ country: 'FR', A: 5 },
				],
			),
			{ scale: ColorRampScale.Log },
		);

		expect(data.nonPositiveOnLogRows).toBe(2);
	});

	it('flags a result that reached the row limit', () => {
		const rows = Array.from({ length: MAX_ROWS }, () => ({
			country: 'US',
			A: 1,
		}));

		expect(
			prepare(makeTable([group('country'), value('A')], rows)).atRowLimit,
		).toBe(true);
	});

	it('draws at most the row limit when joined queries skip it', () => {
		const rows = Array.from({ length: MAX_ROWS + 5 }, (_, index) => ({
			'geo.location.lat': (index % 180) - 90,
			'geo.location.lon': 0,
			A: 1,
		}));
		const data = prepare(
			makeTable(
				[group('geo.location.lat'), group('geo.location.lon'), value('A')],
				rows,
			),
		);

		expect(data.points).toHaveLength(MAX_ROWS);
		expect(data.atRowLimit).toBe(true);
	});
});
