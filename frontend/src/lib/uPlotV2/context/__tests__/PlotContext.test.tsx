import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { updateSeriesVisibilityToLocalStorage } from 'lib/visualization/panels/utils/legendVisibilityUtils';
import {
	PlotContextProvider,
	usePlotContext,
} from 'lib/uPlotV2/context/PlotContext';
import type uPlot from 'uplot';

jest.mock('lib/visualization/panels/utils/legendVisibilityUtils', () => ({
	updateSeriesVisibilityToLocalStorage: jest.fn(),
}));

const mockUpdateSeriesVisibilityToLocalStorage =
	updateSeriesVisibilityToLocalStorage as jest.MockedFunction<
		typeof updateSeriesVisibilityToLocalStorage
	>;

interface MockSeries extends Partial<uPlot.Series> {
	label?: string;
	show?: boolean;
}

const createMockPlot = (series: MockSeries[] = []): uPlot =>
	({
		series,
		batch: jest.fn((fn: () => void) => fn()),
		setSeries: jest.fn(),
		redraw: jest.fn(),
	}) as unknown as uPlot;

interface TestComponentProps {
	plot?: uPlot;
	id?: string;
	shouldSaveSelectionPreference?: boolean;
}

const TestComponent = ({
	plot,
	id,
	shouldSaveSelectionPreference,
}: TestComponentProps): JSX.Element => {
	const {
		setPlotContextInitialState,
		syncSeriesVisibilityToLocalStorage,
		onToggleSeriesVisibility,
		onToggleSeriesOnOff,
		onShowOnlySeries,
		onShowAllSeries,
		onFocusSeries,
		onHighlightSeries,
	} = usePlotContext();
	const handleInit = (): void => {
		if (!plot || !id || typeof shouldSaveSelectionPreference !== 'boolean') {
			return;
		}

		setPlotContextInitialState({
			uPlotInstance: plot,
			id,
			shouldSaveSelectionPreference,
		});
	};

	return (
		<div>
			<button type="button" data-testid="init" onClick={handleInit}>
				Init
			</button>
			<button
				type="button"
				data-testid="sync-visibility"
				onClick={(): void => syncSeriesVisibilityToLocalStorage()}
			>
				Sync visibility
			</button>
			<button
				type="button"
				data-testid="toggle-visibility"
				onClick={(): void => onToggleSeriesVisibility(1)}
			>
				Toggle visibility
			</button>
			<button
				type="button"
				data-testid="toggle-on-off-1"
				onClick={(): void => onToggleSeriesOnOff(1)}
			>
				Toggle on/off 1
			</button>
			<button
				type="button"
				data-testid="toggle-on-off-2"
				onClick={(): void => onToggleSeriesOnOff(2)}
			>
				Toggle on/off 2
			</button>
			<button
				type="button"
				data-testid="toggle-on-off-5"
				onClick={(): void => onToggleSeriesOnOff(5)}
			>
				Toggle on/off 5
			</button>
			<button
				type="button"
				data-testid="focus-series"
				onClick={(): void => onFocusSeries(1)}
			>
				Focus series
			</button>
			<button
				type="button"
				data-testid="show-only-1"
				onClick={(): void => onShowOnlySeries(1)}
			>
				Show only 1
			</button>
			<button
				type="button"
				data-testid="show-all"
				onClick={(): void => onShowAllSeries()}
			>
				Show all
			</button>
			<button
				type="button"
				data-testid="highlight-1"
				onClick={(): void => onHighlightSeries(1)}
			>
				Highlight 1
			</button>
			<button
				type="button"
				data-testid="clear-highlight"
				onClick={(): void => onHighlightSeries(null)}
			>
				Clear highlight
			</button>
		</div>
	);
};

describe('PlotContext', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('throws when usePlotContext is used outside provider', () => {
		const Consumer = (): JSX.Element => {
			usePlotContext();
			return <div />;
		};

		expect(() => render(<Consumer />)).toThrow(
			'Should be used inside the context',
		);
	});

	it('syncSeriesVisibilityToLocalStorage does nothing without plot or widgetId', async () => {
		const user = userEvent.setup();

		render(
			<PlotContextProvider>
				<TestComponent />
			</PlotContextProvider>,
		);

		await user.click(screen.getByTestId('sync-visibility'));

		expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
	});

	it('syncSeriesVisibilityToLocalStorage serializes series visibility to localStorage helper', async () => {
		const user = userEvent.setup();
		const plot = createMockPlot([
			{ label: 'x-axis', show: true },
			{ label: 'CPU', show: true },
			{ label: 'Memory', show: false },
		]);

		render(
			<PlotContextProvider>
				<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
			</PlotContextProvider>,
		);

		await user.click(screen.getByTestId('init'));
		await user.click(screen.getByTestId('sync-visibility'));

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
		it('does nothing when plot instance is not set', async () => {
			const user = userEvent.setup();

			render(
				<PlotContextProvider>
					<TestComponent />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('toggle-visibility'));

			// No errors and no calls to localStorage helper
			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});

		it('highlights a single series and saves visibility when preferences are enabled', async () => {
			const user = userEvent.setup();
			const series: MockSeries[] = [
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: true },
			];
			const plot = createMockPlot(series);

			render(
				<PlotContextProvider>
					<TestComponent
						plot={plot}
						id="widget-visibility"
						shouldSaveSelectionPreference
					/>
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('toggle-visibility'));

			const setSeries = (plot.setSeries as jest.Mock).mock.calls;

			// index 0 is skipped, so we expect calls for 1 and 2
			expect(setSeries).toStrictEqual([
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

		it('resets visibility for all series when toggling the same index again', async () => {
			const user = userEvent.setup();
			const series: MockSeries[] = [
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: true },
			];
			const plot = createMockPlot(series);

			render(
				<PlotContextProvider>
					<TestComponent
						plot={plot}
						id="widget-reset"
						shouldSaveSelectionPreference
					/>
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('toggle-visibility'));

			(plot.setSeries as jest.Mock).mockClear();

			await user.click(screen.getByTestId('toggle-visibility'));

			const setSeries = (plot.setSeries as jest.Mock).mock.calls;

			// After reset, all non-zero series should be shown
			expect(setSeries).toStrictEqual([
				[1, { show: true }],
				[2, { show: true }],
			]);
		});
	});

	describe('onToggleSeriesOnOff', () => {
		it('does nothing when plot instance is not set', async () => {
			const user = userEvent.setup();

			render(
				<PlotContextProvider>
					<TestComponent />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('toggle-on-off-1'));

			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});

		it('toggles series show flag and saves visibility when preferences are enabled', async () => {
			const user = userEvent.setup();
			const series: MockSeries[] = [
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: true },
			];
			const plot = createMockPlot(series);

			render(
				<PlotContextProvider>
					<TestComponent
						plot={plot}
						id="widget-toggle"
						shouldSaveSelectionPreference
					/>
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('toggle-on-off-1'));

			expect(plot.setSeries).toHaveBeenCalledWith(1, { show: false });
			expect(mockUpdateSeriesVisibilityToLocalStorage).toHaveBeenCalledTimes(1);
			expect(mockUpdateSeriesVisibilityToLocalStorage).toHaveBeenCalledWith(
				'widget-toggle',
				expect.any(Array),
			);
		});

		it('does not toggle when target series does not exist', async () => {
			const user = userEvent.setup();
			const series: MockSeries[] = [{ label: 'x-axis', show: true }];
			const plot = createMockPlot(series);

			render(
				<PlotContextProvider>
					<TestComponent
						plot={plot}
						id="widget-missing-series"
						shouldSaveSelectionPreference
					/>
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('toggle-on-off-5'));

			expect(plot.setSeries).not.toHaveBeenCalled();
			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});

		it('does not persist visibility when preferences flag is disabled', async () => {
			const user = userEvent.setup();
			const series: MockSeries[] = [
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: true },
			];
			const plot = createMockPlot(series);

			render(
				<PlotContextProvider>
					<TestComponent
						plot={plot}
						id="widget-no-persist"
						shouldSaveSelectionPreference={false}
					/>
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('toggle-on-off-1'));

			expect(plot.setSeries).toHaveBeenCalledWith(1, { show: false });
			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});

		it('refuses to hide the last series showing', async () => {
			const user = userEvent.setup();
			const plot = createMockPlot([
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: false },
			]);

			render(
				<PlotContextProvider>
					<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('toggle-on-off-1'));

			// An empty chart is never a state worth reaching.
			expect(plot.setSeries).not.toHaveBeenCalled();
			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});

		it('still shows a hidden series when only one is left showing', async () => {
			const user = userEvent.setup();
			const plot = createMockPlot([
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: false },
				{ label: 'Memory', show: true },
			]);

			render(
				<PlotContextProvider>
					<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('toggle-on-off-1'));

			expect(plot.setSeries).toHaveBeenCalledWith(1, { show: true });
		});
	});

	describe('onFocusSeries', () => {
		it('does nothing when plot instance is not set', async () => {
			const user = userEvent.setup();

			render(
				<PlotContextProvider>
					<TestComponent />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('focus-series'));
		});

		it('sets focus on the given series index', async () => {
			const user = userEvent.setup();
			const plot = createMockPlot([
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
			]);

			render(
				<PlotContextProvider>
					<TestComponent
						plot={plot}
						id="widget-focus"
						shouldSaveSelectionPreference={false}
					/>
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('focus-series'));

			expect(plot.setSeries).toHaveBeenCalledWith(1, { focus: true }, false);
		});
	});
	describe('onShowOnlySeries', () => {
		const renderWithSeries = (
			series: MockSeries[],
		): { plot: uPlot; user: ReturnType<typeof userEvent.setup> } => {
			const user = userEvent.setup();
			const plot = createMockPlot(series);

			render(
				<PlotContextProvider>
					<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
				</PlotContextProvider>,
			);

			return { plot, user };
		};

		it('hides every other series, leaving the x-axis alone', async () => {
			const { plot, user } = renderWithSeries([
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: true },
			]);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('show-only-1'));

			expect(plot.setSeries).toHaveBeenCalledWith(1, { show: true });
			expect(plot.setSeries).toHaveBeenCalledWith(2, { show: false });
			expect(plot.setSeries).not.toHaveBeenCalledWith(0, expect.anything());
			expect(mockUpdateSeriesVisibilityToLocalStorage).toHaveBeenCalled();
		});

		it('keeps isolating the series that is already the only one shown', async () => {
			const { plot, user } = renderWithSeries([
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: false },
			]);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('show-only-1'));

			expect(plot.setSeries).toHaveBeenCalledWith(1, { show: true });
			expect(plot.setSeries).toHaveBeenCalledWith(2, { show: false });
		});
	});

	describe('onShowAllSeries', () => {
		it('shows every hidden series again', async () => {
			const user = userEvent.setup();
			const plot = createMockPlot([
				{ label: 'x-axis', show: true },
				{ label: 'CPU', show: true },
				{ label: 'Memory', show: false },
			]);

			render(
				<PlotContextProvider>
					<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('show-all'));

			expect(plot.setSeries).toHaveBeenCalledWith(1, { show: true });
			expect(plot.setSeries).toHaveBeenCalledWith(2, { show: true });
			expect(plot.setSeries).not.toHaveBeenCalledWith(0, expect.anything());
		});
	});

	describe('onHighlightSeries', () => {
		const series = (): MockSeries[] => [
			{ label: 'x-axis', show: true },
			{ label: 'CPU', show: true, width: 2 },
			{ label: 'Memory', show: true, width: 2 },
		];

		it('dims the other series and thickens the highlighted one', async () => {
			const user = userEvent.setup();
			const plot = createMockPlot(series());

			render(
				<PlotContextProvider>
					<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('highlight-1'));

			expect(plot.series[1].alpha).toBe(1);
			expect(plot.series[1].width).toBe(3.2);
			expect(plot.series[2].alpha).toBe(0.16);
			expect(plot.series[2].width).toBe(2);
			// Only the stroke changed, so the cached paths are reused.
			expect(plot.redraw).toHaveBeenCalledWith(false);
		});

		it('restores every series when the highlight is cleared', async () => {
			const user = userEvent.setup();
			const plot = createMockPlot(series());

			render(
				<PlotContextProvider>
					<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('highlight-1'));
			await user.click(screen.getByTestId('clear-highlight'));

			expect(plot.series[1].alpha).toBe(1);
			expect(plot.series[1].width).toBe(2);
			expect(plot.series[2].alpha).toBe(1);
			expect(plot.series[2].width).toBe(2);
		});

		it('drops the dim when the highlighted series is hidden', async () => {
			const user = userEvent.setup();
			const plot = createMockPlot(series());
			// The mock's setSeries doesn't mutate, so mirror what uPlot would do.
			(plot.setSeries as jest.Mock).mockImplementation(
				(index: number, opts: { show?: boolean }) => {
					if (typeof opts.show === 'boolean') {
						(plot.series[index] as MockSeries).show = opts.show;
					}
				},
			);

			render(
				<PlotContextProvider>
					<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('highlight-1'));
			await user.click(screen.getByTestId('toggle-on-off-1'));

			// Otherwise every remaining series stays faded and the panel reads as
			// an isolation instead of one series being excluded.
			expect(plot.series[2].alpha).toBe(1);
			expect(plot.series[2].width).toBe(2);
		});

		it('keeps the dim when a different series is hidden', async () => {
			const user = userEvent.setup();
			const plot = createMockPlot(series());
			(plot.setSeries as jest.Mock).mockImplementation(
				(index: number, opts: { show?: boolean }) => {
					if (typeof opts.show === 'boolean') {
						(plot.series[index] as MockSeries).show = opts.show;
					}
				},
			);

			render(
				<PlotContextProvider>
					<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('highlight-1'));
			await user.click(screen.getByTestId('toggle-on-off-2'));

			expect(plot.series[1].alpha).toBe(1);
			expect(plot.series[2].alpha).toBe(0.16);
		});

		it('leaves visibility untouched', async () => {
			const user = userEvent.setup();
			const plot = createMockPlot(series());

			render(
				<PlotContextProvider>
					<TestComponent plot={plot} id="widget-123" shouldSaveSelectionPreference />
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('highlight-1'));

			expect(plot.setSeries).not.toHaveBeenCalled();
			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
		});
	});
});
