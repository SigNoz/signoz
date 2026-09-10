import { renderHook } from '@testing-library/react';
import { usePlotContext } from 'lib/uPlotV2/context/PlotContext';
import { useLegendActions } from 'lib/uPlotV2/hooks/useLegendActions';

jest.mock('lib/uPlotV2/context/PlotContext');

const mockUsePlotContext = usePlotContext as jest.MockedFunction<
	typeof usePlotContext
>;

describe('useLegendActions', () => {
	let onToggleSeriesVisibility: jest.Mock;
	let onToggleSeriesOnOff: jest.Mock;
	let onShowOnlySeries: jest.Mock;
	let onShowSeries: jest.Mock;
	let onFocusSeries: jest.Mock;
	let onHighlightSeries: jest.Mock;
	let setPlotContextInitialState: jest.Mock;
	let syncSeriesVisibilityToLocalStorage: jest.Mock;
	let cancelAnimationFrameSpy: jest.SpyInstance<void, [handle: number]>;

	beforeAll(() => {
		jest
			.spyOn(global, 'requestAnimationFrame')
			.mockImplementation((cb: FrameRequestCallback): number => {
				cb(0);
				return 1;
			});

		cancelAnimationFrameSpy = jest
			.spyOn(global, 'cancelAnimationFrame')
			.mockImplementation(() => {});
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	beforeEach(() => {
		onToggleSeriesVisibility = jest.fn();
		onToggleSeriesOnOff = jest.fn();
		onShowOnlySeries = jest.fn();
		onShowSeries = jest.fn();
		onFocusSeries = jest.fn();
		onHighlightSeries = jest.fn();
		setPlotContextInitialState = jest.fn();
		syncSeriesVisibilityToLocalStorage = jest.fn();

		mockUsePlotContext.mockReturnValue({
			onToggleSeriesVisibility,
			onToggleSeriesOnOff,
			onShowOnlySeries,
			onShowSeries,
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

			result.current.onToggleSeries(2);

			expect(onToggleSeriesOnOff).toHaveBeenCalledWith(2);
			// The row must never isolate — that is what "Only" is for.
			expect(onToggleSeriesVisibility).not.toHaveBeenCalled();
		});

		it('forwards the Only and Add actions to the plot', () => {
			const { result } = renderHook(() => useLegendActions());

			result.current.onShowOnlySeries(1);
			result.current.onShowSeries(3);

			expect(onShowOnlySeries).toHaveBeenCalledWith(1);
			expect(onShowSeries).toHaveBeenCalledWith(3);
		});
	});

	describe('hover highlight', () => {
		it('highlights the hovered series', () => {
			const { result } = renderHook(() => useLegendActions());

			result.current.onHoverSeries(2);

			expect(onHighlightSeries).toHaveBeenCalledWith(2);
		});

		it('clears the highlight on leave', () => {
			const { result } = renderHook(() => useLegendActions());

			result.current.onHoverSeries(null);

			expect(onHighlightSeries).toHaveBeenCalledWith(null);
		});

		it('coalesces rapid hovers into one frame', () => {
			const { result } = renderHook(() => useLegendActions());

			result.current.onHoverSeries(1);
			result.current.onHoverSeries(2);

			// Each new hover cancels the frame the previous one queued.
			expect(cancelAnimationFrameSpy).toHaveBeenCalled();
		});

		it('cancels a pending highlight frame on unmount', () => {
			jest
				.spyOn(global, 'requestAnimationFrame')
				.mockImplementation((): number => 7);

			const { result, unmount } = renderHook(() => useLegendActions());
			result.current.onHoverSeries(1);
			unmount();

			expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(7);
		});
	});
});
