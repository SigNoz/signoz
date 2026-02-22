import { renderHook } from '@testing-library/react';
import uPlot from 'uplot';

import type { UseBarChartStackingParams } from '../useBarChartStacking';
import { useBarChartStacking } from '../useBarChartStacking';

type MockConfig = { addHook: jest.Mock };

function asConfig(c: MockConfig): UseBarChartStackingParams['config'] {
	return (c as unknown) as UseBarChartStackingParams['config'];
}

function createMockConfig(): {
	config: MockConfig;
	invokeSetData: (plot: uPlot) => void;
	invokeSetSeries: (
		plot: uPlot,
		seriesIndex: number | null,
		opts: Partial<uPlot.Series> & { focus?: boolean },
	) => void;
	removeSetData: jest.Mock;
	removeSetSeries: jest.Mock;
} {
	let setDataHandler: ((plot: uPlot) => void) | null = null;
	let setSeriesHandler:
		| ((plot: uPlot, seriesIndex: number | null, opts: uPlot.Series) => void)
		| null = null;

	const removeSetData = jest.fn();
	const removeSetSeries = jest.fn();

	const addHook = jest.fn(
		(
			hookName: string,
			handler: (plot: uPlot, ...args: unknown[]) => void,
		): (() => void) => {
			if (hookName === 'setData') {
				setDataHandler = handler as (plot: uPlot) => void;
				return removeSetData;
			}
			if (hookName === 'setSeries') {
				setSeriesHandler = handler as (
					plot: uPlot,
					seriesIndex: number | null,
					opts: uPlot.Series,
				) => void;
				return removeSetSeries;
			}
			return jest.fn();
		},
	);

	const config: MockConfig = { addHook };

	const invokeSetData = (plot: uPlot): void => {
		setDataHandler?.(plot);
	};

	const invokeSetSeries = (
		plot: uPlot,
		seriesIndex: number | null,
		opts: Partial<uPlot.Series> & { focus?: boolean },
	): void => {
		setSeriesHandler?.(plot, seriesIndex, opts as uPlot.Series);
	};

	return {
		config,
		invokeSetData,
		invokeSetSeries,
		removeSetData,
		removeSetSeries,
	};
}

function createMockPlot(overrides: Partial<uPlot> = {}): uPlot {
	return ({
		data: [
			[0, 1, 2],
			[1, 2, 3],
			[4, 5, 6],
		],
		series: [{ show: true }, { show: true }, { show: true }],
		delBand: jest.fn(),
		addBand: jest.fn(),
		setData: jest.fn(),
		...overrides,
	} as unknown) as uPlot;
}

describe('useBarChartStacking', () => {
	it('returns data as-is when isStackedBarChart is false', () => {
		const data: uPlot.AlignedData = [
			[100, 200],
			[1, 2],
			[3, 4],
		];
		const { result } = renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: false,
				config: null,
			}),
		);
		expect(result.current).toBe(data);
	});

	it('returns data as-is when config is null and isStackedBarChart is true', () => {
		const data: uPlot.AlignedData = [
			[0, 1],
			[1, 2],
			[4, 5],
		];
		const { result } = renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: true,
				config: null,
			}),
		);
		// Still returns stacked data (computed in useMemo); no hooks registered
		expect(result.current[0]).toEqual([0, 1]);
		expect(result.current[1]).toEqual([5, 7]); // stacked
		expect(result.current[2]).toEqual([4, 5]);
	});

	it('returns stacked data when isStackedBarChart is true and multiple value series', () => {
		const data: uPlot.AlignedData = [
			[0, 1, 2],
			[1, 2, 3],
			[4, 5, 6],
			[7, 8, 9],
		];
		const { result } = renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: true,
				config: null,
			}),
		);
		expect(result.current[0]).toEqual([0, 1, 2]);
		expect(result.current[1]).toEqual([12, 15, 18]); // s1+s2+s3
		expect(result.current[2]).toEqual([11, 13, 15]); // s2+s3
		expect(result.current[3]).toEqual([7, 8, 9]);
	});

	it('returns data as-is when only one value series (no stacking needed)', () => {
		const data: uPlot.AlignedData = [
			[0, 1],
			[1, 2],
		];
		const { result } = renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: true,
				config: null,
			}),
		);
		expect(result.current).toEqual(data);
	});

	it('registers setData and setSeries hooks when isStackedBarChart and config provided', () => {
		const { config } = createMockConfig();
		const data: uPlot.AlignedData = [
			[0, 1],
			[1, 2],
			[3, 4],
		];

		renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: true,
				config: asConfig(config),
			}),
		);

		expect(config.addHook).toHaveBeenCalledWith('setData', expect.any(Function));
		expect(config.addHook).toHaveBeenCalledWith(
			'setSeries',
			expect.any(Function),
		);
	});

	it('does not register hooks when isStackedBarChart is false', () => {
		const { config } = createMockConfig();
		const data: uPlot.AlignedData = [
			[0, 1],
			[1, 2],
			[3, 4],
		];

		renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: false,
				config: asConfig(config),
			}),
		);

		expect(config.addHook).not.toHaveBeenCalled();
	});

	it('calls cleanup when unmounted', () => {
		const { config, removeSetData, removeSetSeries } = createMockConfig();
		const data: uPlot.AlignedData = [
			[0, 1],
			[1, 2],
			[3, 4],
		];

		const { unmount } = renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: true,
				config: asConfig(config),
			}),
		);

		unmount();

		expect(removeSetData).toHaveBeenCalled();
		expect(removeSetSeries).toHaveBeenCalled();
	});

	it('re-stacks and updates plot when setData hook is invoked', () => {
		const { config, invokeSetData } = createMockConfig();
		const data: uPlot.AlignedData = [
			[0, 1, 2],
			[1, 2, 3],
			[4, 5, 6],
		];
		const plot = createMockPlot({
			data: [
				[0, 1, 2],
				[5, 7, 9],
				[4, 5, 6],
			],
		});

		renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: true,
				config: asConfig(config),
			}),
		);

		invokeSetData(plot);

		expect(plot.delBand).toHaveBeenCalledWith(null);
		expect(plot.addBand).toHaveBeenCalled();
		expect(plot.setData).toHaveBeenCalledWith(
			expect.arrayContaining([
				[0, 1, 2],
				expect.any(Array), // stacked row 1
				expect.any(Array), // stacked row 2
			]),
		);
	});

	it('re-stacks when setSeries hook is invoked (e.g. legend toggle)', () => {
		const { config, invokeSetSeries } = createMockConfig();
		const data: uPlot.AlignedData = [
			[0, 1],
			[10, 20],
			[5, 10],
		];
		// Plot data must match unstacked length so canApplyStacking passes
		const plot = createMockPlot({
			data: [
				[0, 1],
				[15, 30],
				[5, 10],
			],
		});

		renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: true,
				config: asConfig(config),
			}),
		);

		invokeSetSeries(plot, 1, { show: false });

		expect(plot.setData).toHaveBeenCalled();
	});

	it('does not re-stack when setSeries is called with focus option', () => {
		const { config, invokeSetSeries } = createMockConfig();
		const data: uPlot.AlignedData = [
			[0, 1],
			[1, 2],
			[3, 4],
		];
		const plot = createMockPlot();

		renderHook(() =>
			useBarChartStacking({
				data,
				isStackedBarChart: true,
				config: asConfig(config),
			}),
		);

		(plot.setData as jest.Mock).mockClear();
		invokeSetSeries(plot, 1, { focus: true } as uPlot.Series);

		expect(plot.setData).not.toHaveBeenCalled();
	});
});
