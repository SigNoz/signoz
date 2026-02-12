import { act, render } from '@testing-library/react';
import { updateSeriesVisibilityToLocalStorage } from 'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils';
import {
	PlotContextProvider,
	usePlotContext,
} from 'lib/uPlotV2/context/PlotContext';
import type uPlot from 'uplot';

jest.mock(
	'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils',
	() => ({
		updateSeriesVisibilityToLocalStorage: jest.fn(),
	}),
);

const mockUpdateSeriesVisibilityToLocalStorage = updateSeriesVisibilityToLocalStorage as jest.MockedFunction<
	typeof updateSeriesVisibilityToLocalStorage
>;

interface MockSeries extends Partial<uPlot.Series> {
	label?: string;
	show?: boolean;
}

const createMockPlot = (series: MockSeries[] = []): uPlot =>
	(({
		series,
		batch: jest.fn((fn: () => void) => fn()),
		setSeries: jest.fn(),
	} as unknown) as uPlot);

const getPlotContext = (): ReturnType<typeof usePlotContext> => {
	let ctx: ReturnType<typeof usePlotContext> | null = null;

	const Consumer = (): JSX.Element => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		ctx = usePlotContext();
		return <div data-testid="consumer" />;
	};

	render(
		<PlotContextProvider>
			<Consumer />
		</PlotContextProvider>,
	);

	if (!ctx) {
		throw new Error('Context was not captured');
	}

	return ctx;
};

describe('PlotContext', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('throws when usePlotContext is used outside provider', () => {
		const Consumer = (): JSX.Element => {
			// eslint-disable-next-line react-hooks/rules-of-hooks
			usePlotContext();
			return <div />;
		};

		expect(() => render(<Consumer />)).toThrow(
			'Should be used inside the context',
		);
	});

	it('syncSeriesVisibilityToLocalStorage does nothing without plot or widgetId', () => {
		const ctx = getPlotContext();

		act(() => {
			ctx.syncSeriesVisibilityToLocalStorage();
		});

		expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
	});

	it('syncSeriesVisibilityToLocalStorage serializes series visibility to localStorage helper', () => {
		const plot = createMockPlot([
			{ label: 'x-axis', show: true },
			{ label: 'CPU', show: true },
			{ label: 'Memory', show: false },
		]);

		const ctx = getPlotContext();

		act(() => {
			ctx.setPlotContextInitialState({
				uPlotInstance: plot,
				widgetId: 'widget-123',
				shouldSaveSelectionPreference: true,
			});
		});

		act(() => {
			ctx.syncSeriesVisibilityToLocalStorage();
		});

		expect(mockUpdateSeriesVisibilityToLocalStorage).toHaveBeenCalledTimes(1);
		expect(mockUpdateSeriesVisibilityToLocalStorage).toHaveBeenCalledWith(
			'widget-123',
			[
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: false },
			],
		);
	});

	describe('onToggleSeriesVisibility', () => {
		it('does nothing when plot instance is not set', () => {
			const ctx = getPlotContext();

			act(() => {
				ctx.onToggleSeriesVisibility(1);
			});

			// No errors and no calls to localStorage helper
			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});

		it('highlights a single series and saves visibility when preferences are enabled', () => {
			const series: MockSeries[] = [
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: true },
			];
			const plot = createMockPlot(series);
			const ctx = getPlotContext();

			act(() => {
				ctx.setPlotContextInitialState({
					uPlotInstance: plot,
					widgetId: 'widget-visibility',
					shouldSaveSelectionPreference: true,
				});
			});

			act(() => {
				ctx.onToggleSeriesVisibility(1);
			});

			const setSeries = (plot.setSeries as jest.Mock).mock.calls;

			// index 0 is skipped, so we expect calls for 1 and 2
			expect(setSeries).toEqual([
				[1, { show: true }],
				[2, { show: false }],
			]);

			expect(mockUpdateSeriesVisibilityToLocalStorage).toHaveBeenCalledTimes(1);
			expect(mockUpdateSeriesVisibilityToLocalStorage).toHaveBeenCalledWith(
				'widget-visibility',
				[
					{ label: 'x-axis', show: true },
					{ label: 'CPU', show: true },
					{ label: 'Memory', show: true },
				],
			);
		});

		it('resets visibility for all series when toggling the same index again', () => {
			const series: MockSeries[] = [
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: true },
			];
			const plot = createMockPlot(series);
			const ctx = getPlotContext();

			act(() => {
				ctx.setPlotContextInitialState({
					uPlotInstance: plot,
					widgetId: 'widget-reset',
					shouldSaveSelectionPreference: true,
				});
			});

			act(() => {
				ctx.onToggleSeriesVisibility(1);
			});

			(plot.setSeries as jest.Mock).mockClear();

			act(() => {
				ctx.onToggleSeriesVisibility(1);
			});

			const setSeries = (plot.setSeries as jest.Mock).mock.calls;

			// After reset, all non-zero series should be shown
			expect(setSeries).toEqual([
				[1, { show: true }],
				[2, { show: true }],
			]);
		});
	});

	describe('onToggleSeriesOnOff', () => {
		it('does nothing when plot instance is not set', () => {
			const ctx = getPlotContext();

			act(() => {
				ctx.onToggleSeriesOnOff(1);
			});

			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});

		it('toggles series show flag and saves visibility when preferences are enabled', () => {
			const series: MockSeries[] = [
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
			];
			const plot = createMockPlot(series);
			const ctx = getPlotContext();

			act(() => {
				ctx.setPlotContextInitialState({
					uPlotInstance: plot,
					widgetId: 'widget-toggle',
					shouldSaveSelectionPreference: true,
				});
			});

			act(() => {
				ctx.onToggleSeriesOnOff(1);
			});

			expect(plot.setSeries).toHaveBeenCalledWith(1, { show: false });
			expect(mockUpdateSeriesVisibilityToLocalStorage).toHaveBeenCalledTimes(1);
			expect(mockUpdateSeriesVisibilityToLocalStorage).toHaveBeenCalledWith(
				'widget-toggle',
				expect.any(Array),
			);
		});

		it('does not toggle when target series does not exist', () => {
			const series: MockSeries[] = [{ label: 'x-axis', show: true }];
			const plot = createMockPlot(series);
			const ctx = getPlotContext();

			act(() => {
				ctx.setPlotContextInitialState({
					uPlotInstance: plot,
					widgetId: 'widget-missing-series',
					shouldSaveSelectionPreference: true,
				});
			});

			act(() => {
				ctx.onToggleSeriesOnOff(5);
			});

			expect(plot.setSeries).not.toHaveBeenCalled();
			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});

		it('does not persist visibility when preferences flag is disabled', () => {
			const series: MockSeries[] = [
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
			];
			const plot = createMockPlot(series);
			const ctx = getPlotContext();

			act(() => {
				ctx.setPlotContextInitialState({
					uPlotInstance: plot,
					widgetId: 'widget-no-persist',
					shouldSaveSelectionPreference: false,
				});
			});

			act(() => {
				ctx.onToggleSeriesOnOff(1);
			});

			expect(plot.setSeries).toHaveBeenCalledWith(1, { show: false });
			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});
	});

	describe('onFocusSeries', () => {
		it('does nothing when plot instance is not set', () => {
			const ctx = getPlotContext();

			act(() => {
				ctx.onFocusSeries(1);
			});
		});

		it('sets focus on the given series index', () => {
			const plot = createMockPlot([
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
			]);
			const ctx = getPlotContext();

			act(() => {
				ctx.setPlotContextInitialState({
					uPlotInstance: plot,
					widgetId: 'widget-focus',
					shouldSaveSelectionPreference: false,
				});
			});

			act(() => {
				ctx.onFocusSeries(1);
			});

			expect(plot.setSeries).toHaveBeenCalledWith(1, { focus: true }, false);
		});
	});
});
