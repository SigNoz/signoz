import type uPlot from 'uplot';

import { uPlotXAxisValuesFormat } from '../constants';

// uPlot subscribes to matchMedia changes on load; the jest.setup polyfill has no addEventListener.
jest.spyOn(window, 'matchMedia').mockReturnValue({
	matches: false,
	addEventListener: jest.fn(),
	removeEventListener: jest.fn(),
} as unknown as MediaQueryList);

// `uplot` is mapped to a mock in jest.config.ts; the dist path loads the real library.
const RealUPlot = jest.requireActual<typeof uPlot>('uplot/dist/uPlot.cjs.js');

const MINUTE = 60;
const HOUR = 3600;
const DAY = 24 * HOUR;

const toSeconds = (iso: string): number => Date.parse(iso) / 1000;

const skipInitialDraw = (): void => {};

const renderTickLabels = (
	isoSplits: string[],
	tickIncrement: number,
	timezone: string,
): uPlot.Axis.StaticValues => {
	const chart = new RealUPlot(
		{
			width: 400,
			height: 200,
			series: [{}, {}],
			axes: [{ values: uPlotXAxisValuesFormat as uPlot.Axis.Values }],
			tzDate: (ts) => RealUPlot.tzDate(new Date(ts * 1e3), timezone),
		},
		[[], []],
		skipInitialDraw,
	);
	const values = chart.axes[0].values as uPlot.Axis.DynamicValues;

	return values(chart, isoSplits.map(toSeconds), 0, 50, tickIncrement);
};

describe('uPlotXAxisValuesFormat', () => {
	it.each([
		{
			tier: 'year',
			timezone: 'UTC',
			increment: 365 * DAY,
			splits: ['2025-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
			expected: ['2025', '2026'],
		},
		{
			tier: 'month',
			timezone: 'UTC',
			increment: 28 * DAY,
			splits: ['2026-07-01T00:00:00Z', '2026-08-01T00:00:00Z'],
			expected: ['Jul\n2026', 'Aug'],
		},
		{
			tier: 'day',
			timezone: 'UTC',
			increment: DAY,
			splits: ['2026-08-10T00:00:00Z', '2026-08-11T00:00:00Z'],
			expected: ['10 Aug\n2026', '11 Aug'],
		},
		{
			tier: 'hour',
			timezone: 'UTC',
			increment: HOUR,
			splits: [
				'2026-08-10T17:30:00Z',
				'2026-08-10T18:30:00Z',
				'2026-08-10T19:30:00Z',
			],
			expected: ['17:30\n10 Aug 26', '18:30', '19:30'],
		},
		{
			tier: 'hour',
			timezone: 'Asia/Kolkata',
			increment: HOUR,
			splits: [
				'2026-08-10T17:30:00Z',
				'2026-08-10T18:30:00Z',
				'2026-08-10T19:30:00Z',
			],
			expected: ['23:00\n10 Aug 26', '00:00\n11 Aug', '01:00'],
		},
		{
			tier: 'minute',
			timezone: 'UTC',
			increment: MINUTE,
			splits: [
				'2026-08-10T23:58:00Z',
				'2026-08-10T23:59:00Z',
				'2026-08-11T00:00:00Z',
			],
			expected: ['23:58\n10 Aug 26', '23:59', '00:00\n11 Aug'],
		},
		{
			tier: 'minute',
			timezone: 'America/New_York',
			increment: MINUTE,
			splits: [
				'2026-08-11T03:58:00Z',
				'2026-08-11T03:59:00Z',
				'2026-08-11T04:00:00Z',
			],
			expected: ['23:58\n10 Aug 26', '23:59', '00:00\n11 Aug'],
		},
		{
			tier: 'second',
			timezone: 'UTC',
			increment: 1,
			splits: [
				'2026-08-10T23:59:59Z',
				'2026-08-11T00:00:00Z',
				'2026-08-11T00:00:01Z',
			],
			expected: [':59\n10 Aug 26 23:59', ':00\n11 Aug 00:00', ':01'],
		},
		{
			tier: 'millisecond',
			timezone: 'UTC',
			increment: 0.001,
			splits: ['2026-08-10T23:59:59.999Z', '2026-08-11T00:00:00.000Z'],
			expected: [':59.999\n10 Aug 26 23:59', ':00.000\n11 Aug 00:00'],
		},
	])(
		'renders $tier ticks in $timezone',
		({ splits, increment, timezone, expected }) => {
			expect(renderTickLabels(splits, increment, timezone)).toStrictEqual(
				expected,
			);
		},
	);
});
