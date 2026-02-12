import React, { useEffect } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import type { LegendItem } from 'lib/uPlotV2/config/types';
import type { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import useLegendsSync from 'lib/uPlotV2/hooks/useLegendsSync';

describe('useLegendsSync', () => {
	let requestAnimationFrameSpy: jest.Mock<
		number,
		[callback: FrameRequestCallback]
	>;
	let cancelAnimationFrameSpy: jest.Mock<void, [handle: number]>;

	beforeAll(() => {
		requestAnimationFrameSpy = jest.fn((cb: FrameRequestCallback): number => {
			cb(0);
			return 1;
		});

		cancelAnimationFrameSpy = jest.fn();

		(global as any).requestAnimationFrame = requestAnimationFrameSpy;
		(global as any).cancelAnimationFrame = cancelAnimationFrameSpy;
	});

	afterEach(() => {
		jest.clearAllMocks();
		cleanup();
	});

	afterAll(() => {
		jest.resetAllMocks();
	});

	type HookResult = ReturnType<typeof useLegendsSync>;
	let latestHookValue: HookResult;

	const createMockConfig = (
		legendItems: Record<number, LegendItem>,
	): {
		config: UPlotConfigBuilder;
		invokeSetSeries: (
			seriesIndex: number | null,
			opts: { show?: boolean; focus?: boolean },
			fireHook?: boolean,
		) => void;
	} => {
		let setSeriesHandler:
			| ((u: uPlot, seriesIndex: number | null, opts: uPlot.Series) => void)
			| null = null;

		const config = ({
			getLegendItems: jest.fn(() => legendItems),
			addHook: jest.fn(
				(
					hookName: string,
					handler: (
						u: uPlot,
						seriesIndex: number | null,
						opts: uPlot.Series,
					) => void,
				) => {
					if (hookName === 'setSeries') {
						setSeriesHandler = handler;
					}

					return (): void => {
						setSeriesHandler = null;
					};
				},
			),
		} as unknown) as UPlotConfigBuilder;

		const invokeSetSeries = (
			seriesIndex: number | null,
			opts: { show?: boolean; focus?: boolean },
		): void => {
			if (setSeriesHandler) {
				setSeriesHandler({} as uPlot, seriesIndex, { ...opts });
			}
		};

		return { config, invokeSetSeries };
	};

	const TestComponent = ({
		config,
		subscribeToFocusChange,
	}: {
		config: UPlotConfigBuilder;
		subscribeToFocusChange?: boolean;
	}): JSX.Element => {
		const value = useLegendsSync({ config, subscribeToFocusChange });
		latestHookValue = value;

		useEffect(() => {
			latestHookValue = value;
		}, [value]);

		return React.createElement('div', { 'data-testid': 'hook-container' });
	};

	it('initializes legend items from config', () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
			2: { seriesIndex: 2, label: 'Memory', show: false, color: '#0f0' },
		};

		const { config } = createMockConfig(initialItems);

		render(
			React.createElement(TestComponent, {
				config,
			}),
		);

		expect(config.getLegendItems).toHaveBeenCalledTimes(1);
		expect(config.addHook).toHaveBeenCalledWith(
			'setSeries',
			expect.any(Function),
		);

		expect(latestHookValue.legendItemsMap).toEqual(initialItems);
	});

	it('updates focusedSeriesIndex when a series gains focus via setSeries by default', async () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		render(
			React.createElement(TestComponent, {
				config,
			}),
		);

		expect(latestHookValue.focusedSeriesIndex).toBeNull();

		await act(async () => {
			invokeSetSeries(1, { focus: true });
		});

		expect(latestHookValue.focusedSeriesIndex).toBe(1);
	});

	it('does not update focusedSeriesIndex when subscribeToFocusChange is false', () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		render(
			React.createElement(TestComponent, {
				config,
				subscribeToFocusChange: false,
			}),
		);

		invokeSetSeries(1, { focus: true });

		expect(latestHookValue.focusedSeriesIndex).toBeNull();
	});

	it('updates legendItemsMap visibility when show changes for a series', async () => {
		const initialItems: Record<number, LegendItem> = {
			0: { seriesIndex: 0, label: 'x-axis', show: true, color: '#000' },
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		render(
			React.createElement(TestComponent, {
				config,
			}),
		);

		// Toggle visibility of series 1
		await act(async () => {
			invokeSetSeries(1, { show: false });
		});

		expect(latestHookValue.legendItemsMap[1].show).toBe(false);
	});

	it('ignores visibility updates for unknown legend items or unchanged show values', () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		render(
			React.createElement(TestComponent, {
				config,
			}),
		);

		const before = latestHookValue;

		// Unknown series index
		invokeSetSeries(5, { show: false });
		// Unchanged visibility for existing item
		invokeSetSeries(1, { show: true });

		const after = latestHookValue;
		expect(after.legendItemsMap).toEqual(before.legendItemsMap);
	});

	it('cancels pending visibility RAF on unmount', () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		// Override RAF to not immediately invoke callback so we can assert cancellation
		requestAnimationFrameSpy.mockImplementationOnce(() => 42);

		const { unmount } = render(
			React.createElement(TestComponent, {
				config,
			}),
		);

		invokeSetSeries(1, { show: false });

		unmount();

		expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(42);
	});
});
