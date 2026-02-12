import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

interface TestComponentProps {
	plot?: uPlot;
	widgetId?: string;
	shouldSaveSelectionPreference?: boolean;
}

const TestComponent = ({
	plot,
	widgetId,
	shouldSaveSelectionPreference,
}: TestComponentProps): JSX.Element => {
	const {
		setPlotContextInitialState,
		syncSeriesVisibilityToLocalStorage,
		onToggleSeriesVisibility,
		onToggleSeriesOnOff,
		onFocusSeries,
	} = usePlotContext();
	const handleInit = (): void => {
		if (
			!plot ||
			!widgetId ||
			typeof shouldSaveSelectionPreference !== 'boolean'
		) {
			return;
		}

		setPlotContextInitialState({
			uPlotInstance: plot,
			widgetId,
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
		</div>
	);
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
				<TestComponent
					plot={plot}
					widgetId="widget-123"
					shouldSaveSelectionPreference
				/>
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
						widgetId="widget-visibility"
						shouldSaveSelectionPreference
					/>
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('toggle-visibility'));

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
						widgetId="widget-reset"
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
			expect(setSeries).toEqual([
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
			];
			const plot = createMockPlot(series);

			render(
				<PlotContextProvider>
					<TestComponent
						plot={plot}
						widgetId="widget-toggle"
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
						widgetId="widget-missing-series"
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
			];
			const plot = createMockPlot(series);

			render(
				<PlotContextProvider>
					<TestComponent
						plot={plot}
						widgetId="widget-no-persist"
						shouldSaveSelectionPreference={false}
					/>
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('toggle-on-off-1'));

			expect(plot.setSeries).toHaveBeenCalledWith(1, { show: false });
			expect(mockUpdateSeriesVisibilityToLocalStorage).not.toHaveBeenCalled();
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
						widgetId="widget-focus"
						shouldSaveSelectionPreference={false}
					/>
				</PlotContextProvider>,
			);

			await user.click(screen.getByTestId('init'));
			await user.click(screen.getByTestId('focus-series'));

			expect(plot.setSeries).toHaveBeenCalledWith(1, { focus: true }, false);
		});
	});
});
