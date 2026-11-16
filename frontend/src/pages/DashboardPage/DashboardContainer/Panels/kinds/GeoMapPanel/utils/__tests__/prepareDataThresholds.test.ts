import type { PanelThreshold } from '../../../../types/threshold';
import {
	countryTable,
	group,
	makeTable,
	prepare,
	value,
} from './prepareGeoMapFixtures';

describe('prepareGeoMapData', () => {
	describe('thresholds', () => {
		const above = (
			value: number,
			color: string,
			unit?: string,
		): PanelThreshold => ({
			operator: '>',
			value,
			color,
			unit,
		});

		it('colors a matching location and leaves the rest to the palette', () => {
			const data = prepare(countryTable, { thresholds: [above(100, 'red')] });

			expect(data.regions.map((datum) => datum.color)).toStrictEqual([
				'red',
				undefined,
				undefined,
			]);
		});

		it('takes the first match and counts the conflict', () => {
			const data = prepare(countryTable, {
				thresholds: [above(50, 'amber'), above(100, 'red')],
			});

			expect(data.regions.map((datum) => datum.color)).toStrictEqual([
				'amber',
				'amber',
				undefined,
			]);
			expect(data.thresholdConflictRows).toBe(1);
		});

		it('compares in the threshold unit', () => {
			const data = prepare(
				makeTable([group('country'), value('A')], [{ country: 'US', A: 1500 }]),
				{
					thresholds: [above(1, 'red', 's')],
					columnUnits: { A: 'ms' },
				},
			);

			expect(data.regions[0].color).toBe('red');
		});

		it('colors points too', () => {
			const data = prepare(
				makeTable(
					[group('lat'), group('lon'), value('A')],
					[{ lat: 1, lon: 2, A: 9 }],
				),
				{ thresholds: [above(5, 'red')] },
			);

			expect(data.points[0].color).toBe('red');
		});
	});
});
