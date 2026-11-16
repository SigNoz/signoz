import type uPlot from 'uplot';

import type { ScatterSeries } from '../types';
import { getCursorHit, prepareScatterChartData } from '../utils';

jest.mock('lib/visualization/panels/utils/legendVisibilityUtils', () => ({
	getStoredSeriesVisibility: jest.fn(),
}));

const SERIES: ScatterSeries[] = [
	{ label: 'cart', xs: [10, 20], ys: [100, 200], sizes: [1, null] },
	{ label: 'checkout', xs: [30], ys: [0] },
];

describe('prepareScatterChartData', () => {
	it('lays series out as facets behind an empty x slot', () => {
		expect(prepareScatterChartData(SERIES)).toStrictEqual([
			null,
			[
				[10, 20],
				[100, 200],
				[1, null],
			],
			[[30], [0]],
		]);
	});
});

describe('getCursorHit', () => {
	const plotWith = (idxs: Array<number | null>): uPlot =>
		({ cursor: { idxs } }) as unknown as uPlot;

	it('reads the series the scatter plugin answered for', () => {
		expect(getCursorHit(plotWith([null, null, 4, null]))).toStrictEqual({
			seriesIndex: 2,
			dataIndex: 4,
		});
	});

	it('takes a data index of 0 as a hit', () => {
		expect(getCursorHit(plotWith([0, 0]))).toStrictEqual({
			seriesIndex: 1,
			dataIndex: 0,
		});
	});

	it('is null off every dot', () => {
		expect(getCursorHit(plotWith([null, null]))).toBeNull();
		expect(getCursorHit({ cursor: {} } as unknown as uPlot)).toBeNull();
	});
});
