import { renderHook } from '@testing-library/react';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { StackMode } from 'lib/uPlotV2/config/types';
import uPlot from 'uplot';

import { useChartStacking } from 'lib/visualization/charts/ChartWrapper/useChartStacking';

type Hooks = Record<string, (...args: unknown[]) => void>;

function createConfig(stack: StackMode): {
	config: UPlotConfigBuilder;
	hooks: Hooks;
} {
	const hooks: Hooks = {};
	const config = {
		getStackMode: (): StackMode => stack,
		addHook: jest.fn((type: string, hook: (...args: unknown[]) => void) => {
			hooks[type] = hook;
			return jest.fn();
		}),
	} as unknown as UPlotConfigBuilder;
	return { config, hooks };
}

const data = [[1], [30], [10]] as unknown as uPlot.AlignedData;

describe('useChartStacking', () => {
	it('returns the data untouched and registers nothing when the config says `none`', () => {
		const { config } = createConfig(StackMode.None);
		const { result } = renderHook(() => useChartStacking({ data, config }));

		expect(result.current).toBe(data);
		expect(config.addHook).not.toHaveBeenCalled();
	});

	it('treats a missing config as unstacked', () => {
		const { result } = renderHook(() => useChartStacking({ data, config: null }));

		expect(result.current).toBe(data);
	});

	it('accumulates raw values when the config declares `normal`', () => {
		const { config } = createConfig(StackMode.Normal);
		const { result } = renderHook(() => useChartStacking({ data, config }));

		expect(result.current).toStrictEqual([[1], [40], [10]]);
	});

	it('rescales each column to its total when the config declares `percent`', () => {
		const { config } = createConfig(StackMode.Percent);
		const { result } = renderHook(() => useChartStacking({ data, config }));

		expect(result.current).toStrictEqual([[1], [100], [25]]);
	});

	it('registers the uPlot hooks that re-stack on data and visibility changes', () => {
		const { config } = createConfig(StackMode.Normal);
		renderHook(() => useChartStacking({ data, config }));

		expect(
			(config.addHook as jest.Mock).mock.calls.map(([type]) => type),
		).toStrictEqual(['setData', 'setSeries']);
	});

	it('re-stacks from the raw values when the legend hides a series', () => {
		const { config, hooks } = createConfig(StackMode.Normal);
		renderHook(() => useChartStacking({ data, config }));

		const plot = {
			data: [[1]],
			series: [{}, { show: true }, { show: false }],
			delBand: jest.fn(),
			addBand: jest.fn(),
			setData: jest.fn(),
		};
		hooks.setSeries(plot, 2, { show: false });

		// The hidden series keeps its raw value and stops contributing to the total.
		expect(plot.setData).toHaveBeenCalledWith([[1], [30], [10]]);
		expect(plot.delBand).toHaveBeenCalledWith(null);
	});

	it('ignores a focus-only setSeries so hovering does not re-stack', () => {
		const { config, hooks } = createConfig(StackMode.Normal);
		renderHook(() => useChartStacking({ data, config }));

		const plot = {
			data: [[1]],
			series: [{}, { show: true }, { show: true }],
			delBand: jest.fn(),
			addBand: jest.fn(),
			setData: jest.fn(),
		};
		hooks.setSeries(plot, 1, { focus: true });

		expect(plot.setData).not.toHaveBeenCalled();
	});
});
