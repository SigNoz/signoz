import { LegendItem } from 'lib/uPlotV2/config/types';

import { filterLegendItems, getShownSeriesState } from '../utils';

const items = (shown: boolean[]): LegendItem[] =>
	shown.map((show, index) => ({
		seriesIndex: index + 1,
		label: `series-${index}`,
		color: '#000',
		show,
	}));

describe('getShownSeriesState', () => {
	it('counts the shown series', () => {
		expect(getShownSeriesState(items([true, false, true]))).toStrictEqual({
			visibleCount: 2,
			soleShownSeriesIndex: null,
		});
	});

	it('names the series when exactly one is shown', () => {
		expect(getShownSeriesState(items([false, true, false]))).toStrictEqual({
			visibleCount: 1,
			soleShownSeriesIndex: 2,
		});
	});

	it('reports nothing shown', () => {
		expect(getShownSeriesState(items([false, false]))).toStrictEqual({
			visibleCount: 0,
			soleShownSeriesIndex: null,
		});
	});
});

describe('filterLegendItems', () => {
	it('matches case-insensitively on the label', () => {
		const filtered = filterLegendItems(items([true, true, true]), 'SERIES-1');
		expect(filtered.map((item) => item.label)).toStrictEqual(['series-1']);
	});

	it('returns every item for a blank query', () => {
		expect(filterLegendItems(items([true, true]), '   ')).toHaveLength(2);
	});
});
