import { PrecisionOption } from 'components/Graph/types';
import { getToolTipValue } from 'components/Graph/yAxisConfig';
import uPlot, { AlignedData, Series } from 'uplot';

import { TooltipContentItem } from '../../types';
import {
	buildTooltipContent,
	FALLBACK_SERIES_COLOR,
	getTooltipBaseValue,
	resolveSeriesColor,
} from '../utils';

jest.mock('components/Graph/yAxisConfig', () => ({
	getToolTipValue: jest.fn(),
}));

const mockGetToolTipValue = getToolTipValue as jest.MockedFunction<
	typeof getToolTipValue
>;

function createUPlotInstance(): uPlot {
	return ({
		data: [],
		cursor: { idx: 0 },
	} as unknown) as uPlot;
}

describe('Tooltip utils', () => {
	describe('resolveSeriesColor', () => {
		it('returns string stroke when provided', () => {
			const u = createUPlotInstance();
			const stroke: Series.Stroke = '#ff0000';

			const color = resolveSeriesColor(stroke, u, 1);

			expect(color).toBe('#ff0000');
		});

		it('returns result of stroke function when provided', () => {
			const u = createUPlotInstance();
			const strokeFn: Series.Stroke = (uInstance, seriesIdx): string =>
				`color-${seriesIdx}-${uInstance.cursor.idx}`;

			const color = resolveSeriesColor(strokeFn, u, 2);

			expect(color).toBe('color-2-0');
		});

		it('returns fallback color when stroke is not provided', () => {
			const u = createUPlotInstance();

			const color = resolveSeriesColor(undefined, u, 1);

			expect(color).toBe(FALLBACK_SERIES_COLOR);
		});
	});

	describe('getTooltipBaseValue', () => {
		it('returns value from aligned data for non-stacked charts', () => {
			const data: AlignedData = [
				[0, 1],
				[10, 20],
			];

			const result = getTooltipBaseValue({
				data,
				index: 1,
				dataIndex: 1,
				isStackedBarChart: false,
			});

			expect(result).toBe(20);
		});

		it('returns null when value is missing', () => {
			const data: AlignedData = [
				[0, 1],
				[10, null],
			];

			const result = getTooltipBaseValue({
				data,
				index: 1,
				dataIndex: 1,
			});

			expect(result).toBeNull();
		});

		it('subtracts next visible stacked value for stacked bar charts', () => {
			// data[1] and data[2] contain stacked values at dataIndex 1
			const data: AlignedData = [
				[0, 1],
				[30, 60], // series 1 stacked
				[10, 20], // series 2 stacked
			];

			const series: Series[] = [
				{ label: 'x', show: true } as Series,
				{ label: 'A', show: true } as Series,
				{ label: 'B', show: true } as Series,
			];

			const result = getTooltipBaseValue({
				data,
				index: 1,
				dataIndex: 1,
				isStackedBarChart: true,
				series,
			});

			// 60 (stacked at series 1) - 20 (next visible stacked) = 40
			expect(result).toBe(40);
		});

		it('skips hidden series when computing base value for stacked charts', () => {
			const data: AlignedData = [
				[0, 1],
				[30, 60], // series 1 stacked
				[10, 20], // series 2 stacked but hidden
				[5, 10], // series 3 stacked and visible
			];

			const series: Series[] = [
				{ label: 'x', show: true } as Series,
				{ label: 'A', show: true } as Series,
				{ label: 'B', show: false } as Series,
				{ label: 'C', show: true } as Series,
			];

			const result = getTooltipBaseValue({
				data,
				index: 1,
				dataIndex: 1,
				isStackedBarChart: true,
				series,
			});

			// 60 (stacked at series 1) - 10 (next *visible* stacked, series 3) = 50
			expect(result).toBe(50);
		});

		it('does not subtract when there is no next visible series', () => {
			const data: AlignedData = [
				[0, 1],
				[10, 20], // series 1
				[5, (null as unknown) as number], // series 2 missing
			];

			const series: Series[] = [
				{ label: 'x', show: true } as Series,
				{ label: 'A', show: true } as Series,
				{ label: 'B', show: false } as Series,
			];

			const result = getTooltipBaseValue({
				data,
				index: 1,
				dataIndex: 1,
				isStackedBarChart: true,
				series,
			});

			expect(result).toBe(20);
		});
	});

	describe('buildTooltipContent', () => {
		const yAxisUnit = 'ms';
		const decimalPrecision: PrecisionOption = 2;

		beforeEach(() => {
			mockGetToolTipValue.mockReset();
			mockGetToolTipValue.mockImplementation(
				(value: string | number): string => `formatted-${value}`,
			);
		});

		function createSeriesConfig(): Series[] {
			return [
				{ label: 'x', show: true } as Series,
				{ label: 'A', show: true, stroke: '#ff0000' } as Series,
				{
					label: 'B',
					show: true,
					stroke: (_u: uPlot, idx: number): string => `color-${idx}`,
				} as Series,
				{ label: 'C', show: false, stroke: '#00ff00' } as Series,
			];
		}

		it('builds tooltip content with active series first', () => {
			const data: AlignedData = [[0], [10], [20], [30]];
			const series = createSeriesConfig();
			const dataIndexes = [null, 0, 0, 0];
			const u = createUPlotInstance();

			const result = buildTooltipContent({
				data,
				series,
				dataIndexes,
				activeSeriesIndex: 2,
				uPlotInstance: u,
				yAxisUnit,
				decimalPrecision,
			});

			expect(result).toHaveLength(2);
			// Active (series index 2) should come first
			expect(result[0]).toMatchObject<Partial<TooltipContentItem>>({
				label: 'B',
				value: 20,
				tooltipValue: 'formatted-20',
				color: 'color-2',
				isActive: true,
			});
			expect(result[1]).toMatchObject<Partial<TooltipContentItem>>({
				label: 'A',
				value: 10,
				tooltipValue: 'formatted-10',
				color: '#ff0000',
				isActive: false,
			});
		});

		it('skips series with null data index or non-finite values', () => {
			const data: AlignedData = [[0], [42], [Infinity]];
			const series: Series[] = [
				{ label: 'x', show: true } as Series,
				{ label: 'A', show: true, stroke: '#ff0000' } as Series,
				{ label: 'B', show: true, stroke: '#00ff00' } as Series,
			];
			const dataIndexes = [null, 0, null];
			const u = createUPlotInstance();

			const result = buildTooltipContent({
				data,
				series,
				dataIndexes,
				activeSeriesIndex: 1,
				uPlotInstance: u,
				yAxisUnit,
				decimalPrecision,
			});

			// Only the finite, non-null value from series A should be included
			expect(result).toHaveLength(1);
			expect(result[0].label).toBe('A');
		});

		it('uses stacked base values when building content for stacked bar charts', () => {
			const data: AlignedData = [[0], [60], [30]];
			const series: Series[] = [
				{ label: 'x', show: true } as Series,
				{ label: 'A', show: true, stroke: '#ff0000' } as Series,
				{ label: 'B', show: true, stroke: '#00ff00' } as Series,
			];
			const dataIndexes = [null, 0, 0];
			const u = createUPlotInstance();

			const result = buildTooltipContent({
				data,
				series,
				dataIndexes,
				activeSeriesIndex: 1,
				uPlotInstance: u,
				yAxisUnit,
				decimalPrecision,
				isStackedBarChart: true,
			});

			// baseValue for series 1 at index 0 should be 60 - 30 (next visible) = 30
			expect(result[0].value).toBe(30);
			expect(result[1].value).toBe(30);
		});
	});
});
