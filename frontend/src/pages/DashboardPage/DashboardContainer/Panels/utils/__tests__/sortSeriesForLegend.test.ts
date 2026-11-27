import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { DashboardtypesLegendOrderDTO } from 'api/generated/services/sigNoz.schemas';

import { sortSeriesForLegend } from '../sortSeriesForLegend';

const custom = (
	customOrder: Record<string, number> = {},
): {
	order: DashboardtypesLegendOrderDTO;
	customOrder: Record<string, number>;
} => ({
	order: DashboardtypesLegendOrderDTO.custom,
	customOrder,
});

function makeSeries(legend: string, values: number[]): PanelSeries {
	return {
		queryName: legend,
		legend,
		labels: {},
		kind: 'series',
		values: values.map((value, index) => ({
			timestamp: (index + 1) * 1_000,
			value,
		})),
		aggregation: { index: 0, alias: '' },
	};
}

const legends = (series: PanelSeries[]): string[] =>
	series.map((item) => item.legend);

// Means descending: DISK, MEM, GPU-10, GPU-2, CPU.
const fleet = [
	makeSeries('CPU %', [10]),
	makeSeries('MEM %', [60]),
	makeSeries('DISK %', [80]),
	makeSeries('GPU-2 %', [30]),
	makeSeries('GPU-10 %', [40]),
];

describe('sortSeriesForLegend', () => {
	it('orders by descending mean unless the order is custom', () => {
		expect(legends(sortSeriesForLegend(fleet, [], undefined))).toStrictEqual([
			'DISK %',
			'MEM %',
			'GPU-10 %',
			'GPU-2 %',
			'CPU %',
		]);
		const byValue = legends(sortSeriesForLegend(fleet, [], undefined));
		expect(
			legends(
				sortSeriesForLegend(fleet, [], {
					order: DashboardtypesLegendOrderDTO.value,
					customOrder: { 'CPU %': -1 },
				}),
			),
		).toStrictEqual(byValue);
		expect(
			legends(sortSeriesForLegend(fleet, [], { customOrder: { 'CPU %': -1 } })),
		).toStrictEqual(byValue);
	});

	it('orders labels naturally when no index is set', () => {
		expect(legends(sortSeriesForLegend(fleet, [], custom()))).toStrictEqual([
			'CPU %',
			'DISK %',
			'GPU-2 %',
			'GPU-10 %',
			'MEM %',
		]);
	});

	it('orders by ascending index, unlisted labels at index 0', () => {
		const sorted = sortSeriesForLegend(
			fleet,
			[],
			custom({ 'CPU %': -2, 'MEM %': -1, 'DISK %': 1 }),
		);

		expect(legends(sorted)).toStrictEqual([
			'CPU %',
			'MEM %',
			'GPU-2 %',
			'GPU-10 %',
			'DISK %',
		]);
	});

	it('produces the same order regardless of input order', () => {
		const order = custom({ 'GPU-2 %': 5 });

		expect(
			legends(sortSeriesForLegend([...fleet].reverse(), [], order)),
		).toStrictEqual(legends(sortSeriesForLegend(fleet, [], order)));
	});

	it('does not mutate the input array', () => {
		const input = [makeSeries('b', [1]), makeSeries('a', [9])];

		sortSeriesForLegend(input, [], custom());

		expect(legends(input)).toStrictEqual(['b', 'a']);
	});
});
