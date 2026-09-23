import { LegendItem } from 'lib/uPlotV2/config/types';

import { filterLegendItems, getVisibleSeriesState } from '../utils';

const items = (shown: boolean[]): LegendItem[] =>
	shown.map((show, index) => ({
		seriesIndex: index + 1,
		label: `series-${index}`,
		color: '#000',
		show,
	}));

describe('getVisibleSeriesState', () => {
	it('counts the shown series', () => {
		const state = getVisibleSeriesState(items([true, false, true]), '');

		expect(state.visibleCount).toBe(2);
		expect(state.soleVisibleSeriesIndex).toBeNull();
		expect(state.isAllVisible).toBe(false);
	});

	it('names the series when exactly one is shown', () => {
		const state = getVisibleSeriesState(items([false, true, false]), '');

		expect(state.visibleCount).toBe(1);
		expect(state.soleVisibleSeriesIndex).toBe(2);
	});

	it('reports nothing shown', () => {
		const state = getVisibleSeriesState(items([false, false]), '');

		expect(state.visibleCount).toBe(0);
		expect(state.soleVisibleSeriesIndex).toBeNull();
	});

	it('reports every series shown', () => {
		expect(getVisibleSeriesState(items([true, true]), '').isAllVisible).toBe(
			true,
		);
	});

	it('counts only the series the search listed', () => {
		const state = getVisibleSeriesState(items([true, true, false]), 'series-1');

		expect(state.listedItems.map((item) => item.label)).toStrictEqual([
			'series-1',
		]);
		expect(state.visibleCount).toBe(1);
	});

	it('reads isolation off every series, not the listed ones', () => {
		const state = getVisibleSeriesState(items([false, true, false]), 'series-2');

		expect(state.listedItems).toHaveLength(1);
		expect(state.soleVisibleSeriesIndex).toBe(2);
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
