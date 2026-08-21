import type { LegendSeries } from '../../../../utils/legendSeries';
import {
	clearSeriesColor,
	filterLegendSeries,
	resolveSeriesColor,
	setSeriesColor,
} from '../legendColors.utils';

const SERIES: LegendSeries[] = [
	{ label: 'frontend', defaultColor: '#ff0000' },
	{ label: 'cartservice', defaultColor: '#00ff00' },
	{ label: 'frontendproxy', defaultColor: '#0000ff' },
];

describe('legendColors.utils', () => {
	describe('filterLegendSeries', () => {
		it('returns all series for an empty/whitespace query', () => {
			expect(filterLegendSeries(SERIES, '')).toHaveLength(3);
			expect(filterLegendSeries(SERIES, '   ')).toHaveLength(3);
		});

		it('matches case-insensitive substrings', () => {
			expect(
				filterLegendSeries(SERIES, 'FRONT').map((s) => s.label),
			).toStrictEqual(['frontend', 'frontendproxy']);
			expect(filterLegendSeries(SERIES, 'cart')).toHaveLength(1);
			expect(filterLegendSeries(SERIES, 'zzz')).toHaveLength(0);
		});
	});

	describe('resolveSeriesColor', () => {
		it('prefers the override, falling back to the default', () => {
			expect(resolveSeriesColor({ frontend: '#111' }, 'frontend', '#ff0000')).toBe(
				'#111',
			);
			expect(resolveSeriesColor(undefined, 'frontend', '#ff0000')).toBe('#ff0000');
			expect(resolveSeriesColor(null, 'frontend', '#ff0000')).toBe('#ff0000');
		});
	});

	describe('setSeriesColor', () => {
		it('adds/overwrites a label without mutating the input', () => {
			const value = { frontend: '#111' };
			const next = setSeriesColor(value, 'cartservice', '#222');
			expect(next).toStrictEqual({ frontend: '#111', cartservice: '#222' });
			expect(value).toStrictEqual({ frontend: '#111' });
		});

		it('handles null/undefined base', () => {
			expect(setSeriesColor(undefined, 'a', '#1')).toStrictEqual({ a: '#1' });
			expect(setSeriesColor(null, 'a', '#1')).toStrictEqual({ a: '#1' });
		});
	});

	describe('clearSeriesColor', () => {
		it('removes a label without mutating the input', () => {
			const value = { frontend: '#111', cartservice: '#222' };
			const next = clearSeriesColor(value, 'frontend');
			expect(next).toStrictEqual({ cartservice: '#222' });
			expect(value).toStrictEqual({ frontend: '#111', cartservice: '#222' });
		});
	});
});
