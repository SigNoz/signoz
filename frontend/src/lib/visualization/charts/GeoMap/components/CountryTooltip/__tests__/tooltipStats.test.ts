import { GeoMapDatum } from '../../../types';
import { buildTooltipStats } from '../tooltipStats';

const datum = (overrides: Partial<GeoMapDatum> = {}): GeoMapDatum => ({
	code: 'DE',
	value: 2.1,
	raw: 'DE',
	...overrides,
});
const sizeMetric = {
	label: 'Requests',
	formatValue: (value: number): string => `${value} req`,
};

describe('buildTooltipStats', () => {
	it('shows nothing more for a single-metric map', () => {
		expect(
			buildTooltipStats({ datum: datum(), sizeMetric: undefined }),
		).toStrictEqual([]);
	});

	it('shows the size metric in its own unit', () => {
		expect(
			buildTooltipStats({ datum: datum({ size: 1200 }), sizeMetric }),
		).toStrictEqual([
			{ label: 'Requests', value: '1200 req', testId: 'geo-map-tooltip-size' },
		]);
	});

	it('shows a dash for a location without a size', () => {
		const [first] = buildTooltipStats({
			datum: datum({ size: null }),
			sizeMetric,
		});
		expect(first.value).toBe('—');
	});

	it("lists the row's own values in place of the size metric", () => {
		const details = [
			{ label: 'requests', value: '23.35 K' },
			{ label: 'p95_ms', value: '182 ms' },
		];
		expect(
			buildTooltipStats({ datum: datum({ size: 1200, details }), sizeMetric }),
		).toStrictEqual(details);
	});
});
