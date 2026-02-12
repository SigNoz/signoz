import { act, cleanup, renderHook } from '@testing-library/react';
import type { LegendItem } from 'lib/uPlotV2/config/types';
import type { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import useLegendsSync from 'lib/uPlotV2/hooks/useLegendsSync';

describe('useLegendsSync', () => {
	let requestAnimationFrameSpy: jest.SpyInstance<
		number,
		[callback: FrameRequestCallback]
	>;
	let cancelAnimationFrameSpy: jest.SpyInstance<void, [handle: number]>;

	beforeAll(() => {
		requestAnimationFrameSpy = jest
			.spyOn(global, 'requestAnimationFrame')
			.mockImplementation((cb: FrameRequestCallback): number => {
				cb(0);
				return 1;
			});

		cancelAnimationFrameSpy = jest
			.spyOn(global, 'cancelAnimationFrame')
			.mockImplementation(() => {});
	});

	afterEach(() => {
		jest.clearAllMocks();
		cleanup();
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

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

	it('initializes legend items from config', () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
			2: { seriesIndex: 2, label: 'Memory', show: false, color: '#0f0' },
		};

		const { config } = createMockConfig(initialItems);

		const { result } = renderHook(() => useLegendsSync({ config }));

		expect(config.getLegendItems).toHaveBeenCalledTimes(1);
		expect(config.addHook).toHaveBeenCalledWith(
			'setSeries',
			expect.any(Function),
		);

		expect(result.current.legendItemsMap).toEqual(initialItems);
	});

	it('updates focusedSeriesIndex when a series gains focus via setSeries by default', async () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		const { result } = renderHook(() => useLegendsSync({ config }));

		expect(result.current.focusedSeriesIndex).toBeNull();

		await act(async () => {
			invokeSetSeries(1, { focus: true });
		});

		expect(result.current.focusedSeriesIndex).toBe(1);
	});

	it('does not update focusedSeriesIndex when subscribeToFocusChange is false', () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		const { result } = renderHook(() =>
			useLegendsSync({ config, subscribeToFocusChange: false }),
		);

		invokeSetSeries(1, { focus: true });

		expect(result.current.focusedSeriesIndex).toBeNull();
	});

	it('updates legendItemsMap visibility when show changes for a series', async () => {
		const initialItems: Record<number, LegendItem> = {
			0: { seriesIndex: 0, label: 'x-axis', show: true, color: '#000' },
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		const { result } = renderHook(() => useLegendsSync({ config }));

		// Toggle visibility of series 1
		await act(async () => {
			invokeSetSeries(1, { show: false });
		});

		expect(result.current.legendItemsMap[1].show).toBe(false);
	});

	it('ignores visibility updates for unknown legend items or unchanged show values', () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		const { result } = renderHook(() => useLegendsSync({ config }));

		const before = result.current.legendItemsMap;

		// Unknown series index
		invokeSetSeries(5, { show: false });
		// Unchanged visibility for existing item
		invokeSetSeries(1, { show: true });

		const after = result.current.legendItemsMap;
		expect(after).toEqual(before);
	});

	it('cancels pending visibility RAF on unmount', () => {
		const initialItems: Record<number, LegendItem> = {
			1: { seriesIndex: 1, label: 'CPU', show: true, color: '#f00' },
		};

		const { config, invokeSetSeries } = createMockConfig(initialItems);

		// Override RAF to not immediately invoke callback so we can assert cancellation
		requestAnimationFrameSpy.mockImplementationOnce(() => 42);

		const { unmount } = renderHook(() => useLegendsSync({ config }));

		invokeSetSeries(1, { show: false });

		unmount();

		expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(42);
	});
});
