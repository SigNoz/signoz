import { GeoMapDatum } from '../../../types';
import { buildTooltipStats } from '../tooltipStats';

const datum = (size?: number | null): GeoMapDatum => ({
	code: 'DE',
	value: 2.1,
	raw: 'DE',
	size,
});
const sizeMetric = {
	label: 'Requests',
	formatValue: (value: number): string => `${value} req`,
};
const rank = { rank: 3, share: 0.25 };

describe('buildTooltipStats', () => {
	it('shows rank and share alone for a single-metric map', () => {
		expect(
			buildTooltipStats({
				datum: datum(),
				rank,
				total: 40,
				sizeMetric: undefined,
			}),
		).toStrictEqual([
			{ label: 'Rank', value: '#3 of 40' },
			{ label: 'Share of total', value: '25.0%' },
		]);
	});

	it('puts the size metric first, formatted in its own unit', () => {
		const [first] = buildTooltipStats({
			datum: datum(1200),
			rank,
			total: 40,
			sizeMetric,
		});
		expect(first).toStrictEqual({
			label: 'Requests',
			value: '1200 req',
			testId: 'geo-map-tooltip-size',
		});
	});

	it('shows a dash for a location without a size', () => {
		const [first] = buildTooltipStats({
			datum: datum(null),
			rank: undefined,
			total: 40,
			sizeMetric,
		});
		expect(first.value).toBe('—');
	});
});
