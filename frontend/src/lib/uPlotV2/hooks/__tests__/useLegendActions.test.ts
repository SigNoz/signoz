import { renderHook } from '@testing-library/react';
import { LegendAction } from 'lib/uPlotV2/components/types';
import { usePlotContext } from 'lib/uPlotV2/context/PlotContext';
import { useLegendActions } from 'lib/uPlotV2/hooks/useLegendActions';
import type { Mock, MockInstance, MockedFunction } from 'vitest';

vi.mock('lib/uPlotV2/context/PlotContext');

const mockUsePlotContext = usePlotContext as MockedFunction<
	typeof usePlotContext
>;

describe('useLegendActions', () => {
	let onToggleSeriesVisibility: Mock;
	let onToggleSeriesOnOff: Mock;
	let onShowOnlySeries: Mock;
	let onShowAllSeries: Mock;
	let onFocusSeries: Mock;
	let onHighlightSeries: Mock;
	let setPlotContextInitialState: Mock;
	let syncSeriesVisibilityToLocalStorage: Mock;
	let cancelAnimationFrameSpy: MockInstance<(handle: number) => void>;

	beforeAll(() => {
		vi
			.spyOn(globalThis, 'requestAnimationFrame')
			.mockImplementation((cb: FrameRequestCallback): number => {
				cb(0);
				return 1;
			});

		cancelAnimationFrameSpy = vi
			.spyOn(globalThis, 'cancelAnimationFrame')
			.mockImplementation(() => {});
	});

	afterAll(() => {
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		onToggleSeriesVisibility = vi.fn();
		onToggleSeriesOnOff = vi.fn();
		onShowOnlySeries = vi.fn();
		onShowAllSeries = vi.fn();
		onFocusSeries = vi.fn();
		onHighlightSeries = vi.fn();
		setPlotContextInitialState = vi.fn();
		syncSeriesVisibilityToLocalStorage = vi.fn();

		mockUsePlotContext.mockReturnValue({
			onToggleSeriesVisibility,
			onToggleSeriesOnOff,
			onShowOnlySeries,
			onShowAllSeries,
			onFocusSeries,
			onHighlightSeries,
			setPlotContextInitialState,
			syncSeriesVisibilityToLocalStorage,
		});

		cancelAnimationFrameSpy.mockClear();
	});

	describe('visibility actions', () => {
		it('toggles a single series on row click', () => {
			const { result } = renderHook(() => useLegendActions());

			result.current({ type: LegendAction.TOGGLE, seriesIndex: 2 });

			expect(onToggleSeriesOnOff).toHaveBeenCalledWith(2);
			// The row must never isolate — that is what "Only" is for.
			expect(onToggleSeriesVisibility).not.toHaveBeenCalled();
		});

		it('forwards the Only and All actions to the plot', () => {
			const { result } = renderHook(() => useLegendActions());

			result.current({ type: LegendAction.SHOW_ONLY, seriesIndex: 1 });
			result.current({ type: LegendAction.SHOW_ALL });

			expect(onShowOnlySeries).toHaveBeenCalledWith(1);
			expect(onShowAllSeries).toHaveBeenCalled();
		});
	});

	describe('hover highlight', () => {
		it('highlights the hovered series', () => {
			const { result } = renderHook(() => useLegendActions());

			result.current({ type: LegendAction.HOVER, seriesIndex: 2 });

			expect(onHighlightSeries).toHaveBeenCalledWith(2);
		});

		it('clears the highlight on leave', () => {
			const { result } = renderHook(() => useLegendActions());

			result.current({ type: LegendAction.HOVER, seriesIndex: null });

			expect(onHighlightSeries).toHaveBeenCalledWith(null);
		});

		it('coalesces rapid hovers into one frame', () => {
			const { result } = renderHook(() => useLegendActions());

			result.current({ type: LegendAction.HOVER, seriesIndex: 1 });
			result.current({ type: LegendAction.HOVER, seriesIndex: 2 });

			// Each new hover cancels the frame the previous one queued.
			expect(cancelAnimationFrameSpy).toHaveBeenCalled();
		});

		it('cancels a pending highlight frame on unmount', () => {
			vi
				.spyOn(globalThis, 'requestAnimationFrame')
				.mockImplementation((): number => 7);

			const { result, unmount } = renderHook(() => useLegendActions());
			result.current({ type: LegendAction.HOVER, seriesIndex: 1 });
			unmount();

			expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(7);
		});
	});
});
