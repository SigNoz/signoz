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
	let onFocusSeriesPlot: jest.Mock;
	let setPlotContextInitialState: jest.Mock;
	let syncSeriesVisibilityToLocalStorage: jest.Mock;
	let setFocusedSeriesIndexMock: jest.Mock;
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
		onFocusSeriesPlot = jest.fn();
		setPlotContextInitialState = jest.fn();
		syncSeriesVisibilityToLocalStorage = jest.fn();
		setFocusedSeriesIndexMock = jest.fn();

		mockUsePlotContext.mockReturnValue({
			onToggleSeriesVisibility,
			onToggleSeriesOnOff,
			onFocusSeries: onFocusSeriesPlot,
			setPlotContextInitialState,
			syncSeriesVisibilityToLocalStorage,
		});

		cancelAnimationFrameSpy.mockClear();
	});

	const createMouseEvent = (options: {
		legendItemId?: number;
		isMarker?: boolean;
	}): any => {
		const { legendItemId, isMarker = false } = options;

		return {
			target: {
				dataset: {
					...(isMarker ? { isLegendMarker: 'true' } : {}),
				},
				closest: jest.fn(() =>
					legendItemId !== undefined
						? { dataset: { legendItemId: String(legendItemId) } }
						: null,
				),
			},
		};
	};

	describe('onLegendClick', () => {
		it('toggles series visibility when clicking on legend label', async () => {
			const { result } = renderHook(() =>
				useLegendActions({
					setFocusedSeriesIndex: setFocusedSeriesIndexMock,
					focusedSeriesIndex: null,
				}),
			);

			result.current.onLegendClick(createMouseEvent({ legendItemId: 0 }));

			expect(onToggleSeriesVisibility).toHaveBeenCalledTimes(1);
			expect(onToggleSeriesVisibility).toHaveBeenCalledWith(0);
			expect(onToggleSeriesOnOff).not.toHaveBeenCalled();
		});

		it('toggles series on/off when clicking on marker', async () => {
			const { result } = renderHook(() =>
				useLegendActions({
					setFocusedSeriesIndex: setFocusedSeriesIndexMock,
					focusedSeriesIndex: null,
				}),
			);

			result.current.onLegendClick(
				createMouseEvent({ legendItemId: 0, isMarker: true }),
			);

			expect(onToggleSeriesOnOff).toHaveBeenCalledTimes(1);
			expect(onToggleSeriesOnOff).toHaveBeenCalledWith(0);
			expect(onToggleSeriesVisibility).not.toHaveBeenCalled();
		});

		it('does nothing when click target is not inside a legend item', async () => {
			const { result } = renderHook(() =>
				useLegendActions({
					setFocusedSeriesIndex: setFocusedSeriesIndexMock,
					focusedSeriesIndex: null,
				}),
			);

			result.current.onLegendClick(createMouseEvent({}));

			expect(onToggleSeriesOnOff).not.toHaveBeenCalled();
			expect(onToggleSeriesVisibility).not.toHaveBeenCalled();
		});
	});

	describe('onFocusSeries', () => {
		it('schedules focus update and calls plot focus handler via mouse move', async () => {
			const { result } = renderHook(() =>
				useLegendActions({
					setFocusedSeriesIndex: setFocusedSeriesIndexMock,
					focusedSeriesIndex: null,
				}),
			);

			result.current.onLegendMouseMove(createMouseEvent({ legendItemId: 0 }));

			expect(setFocusedSeriesIndexMock).toHaveBeenCalledWith(0);
			expect(onFocusSeriesPlot).toHaveBeenCalledWith(0);
		});

		it('cancels previous animation frame before scheduling new one on subsequent mouse moves', async () => {
			const { result } = renderHook(() =>
				useLegendActions({
					setFocusedSeriesIndex: setFocusedSeriesIndexMock,
					focusedSeriesIndex: null,
				}),
			);

			result.current.onLegendMouseMove(createMouseEvent({ legendItemId: 0 }));
			result.current.onLegendMouseMove(createMouseEvent({ legendItemId: 1 }));

			expect(cancelAnimationFrameSpy).toHaveBeenCalled();
		});
	});

	describe('onLegendMouseMove', () => {
		it('focuses new series when hovering over different legend item', async () => {
			const { result } = renderHook(() =>
				useLegendActions({
					setFocusedSeriesIndex: setFocusedSeriesIndexMock,
					focusedSeriesIndex: 0,
				}),
			);

			result.current.onLegendMouseMove(createMouseEvent({ legendItemId: 1 }));

			expect(setFocusedSeriesIndexMock).toHaveBeenCalledWith(1);
			expect(onFocusSeriesPlot).toHaveBeenCalledWith(1);
		});

		it('does nothing when hovering over already focused series', async () => {
			const { result } = renderHook(() =>
				useLegendActions({
					setFocusedSeriesIndex: setFocusedSeriesIndexMock,
					focusedSeriesIndex: 1,
				}),
			);

			result.current.onLegendMouseMove(createMouseEvent({ legendItemId: 1 }));

			expect(setFocusedSeriesIndexMock).not.toHaveBeenCalled();
			expect(onFocusSeriesPlot).not.toHaveBeenCalled();
		});
	});

	describe('onLegendMouseLeave', () => {
		it('cancels pending animation frame and clears focus state', async () => {
			const { result } = renderHook(() =>
				useLegendActions({
					setFocusedSeriesIndex: setFocusedSeriesIndexMock,
					focusedSeriesIndex: null,
				}),
			);

			result.current.onLegendMouseMove(createMouseEvent({ legendItemId: 0 }));
			result.current.onLegendMouseLeave();

			expect(cancelAnimationFrameSpy).toHaveBeenCalled();
			expect(setFocusedSeriesIndexMock).toHaveBeenCalledWith(null);
			expect(onFocusSeriesPlot).toHaveBeenCalledWith(null);
		});
	});
});
