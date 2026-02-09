import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import type { AlignedData } from 'uplot';

import { PlotContextProvider } from '../../context/PlotContext';
import UPlotChart from '../UPlotChart';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock(
	'container/DashboardContainer/visualization/panels/utils/legendVisibilityUtils',
	() => ({
		getStoredSeriesVisibility: jest.fn(),
		updateSeriesVisibilityToLocalStorage: jest.fn(),
	}),
);

jest.mock('@sentry/react', () => ({
	ErrorBoundary: ({ children }: { children: ReactNode }): JSX.Element => (
		<>{children}</>
	),
}));

jest.mock('pages/ErrorBoundaryFallback/ErrorBoundaryFallback', () => ({
	__esModule: true,
	default: (): JSX.Element => <div>Error Fallback</div>,
}));

interface MockUPlotInstance {
	root: HTMLDivElement;
	setData: jest.Mock;
	setSize: jest.Mock;
	destroy: jest.Mock;
}

let instances: MockUPlotInstance[] = [];
const uPlotCtor = jest.fn();

jest.mock('uplot', () => {
	function MockUPlot(
		opts: Record<string, unknown>,
		data: unknown,
		target: HTMLElement,
	): MockUPlotInstance {
		uPlotCtor(opts, data, target);

		const rootEl = document.createElement('div');
		target.appendChild(rootEl);

		const inst: MockUPlotInstance = {
			root: rootEl,
			setData: jest.fn(),
			setSize: jest.fn(),
			destroy: jest.fn(),
		};
		instances.push(inst);
		return inst;
	}

	MockUPlot.paths = {
		spline: jest.fn(() => jest.fn()),
		bars: jest.fn(() => jest.fn()),
		linear: jest.fn(() => jest.fn()),
		stepped: jest.fn(() => jest.fn()),
	};
	MockUPlot.tzDate = jest.fn();

	return { __esModule: true, default: MockUPlot };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockConfig = (): Record<string, jest.Mock> => ({
	getConfig: jest.fn().mockReturnValue({
		series: [{ value: (): string => '' }],
		axes: [],
		scales: {},
		hooks: {},
		cursor: {},
	}),
	getWidgetId: jest.fn().mockReturnValue(undefined),
	getShouldSaveSelectionPreference: jest.fn().mockReturnValue(false),
});

const validData: AlignedData = [
	[1, 2, 3],
	[10, 20, 30],
];
const emptyData: AlignedData = [[]];

const Wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
	<PlotContextProvider>{children}</PlotContextProvider>
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UPlotChart', () => {
	beforeEach(() => {
		instances = [];
		uPlotCtor.mockClear();
	});

	describe('when data is empty', () => {
		it('displays "No Data" message instead of the chart container', () => {
			render(
				<UPlotChart
					config={createMockConfig() as any}
					data={emptyData}
					width={600}
					height={400}
				/>,
				{ wrapper: Wrapper },
			);

			expect(screen.getByText('No Data')).toBeInTheDocument();
			expect(screen.queryByTestId('uplot-main-div')).not.toBeInTheDocument();
		});

		it('sizes the empty-state container to the given width and height', () => {
			render(
				<UPlotChart
					config={createMockConfig() as any}
					data={emptyData}
					width={750}
					height={350}
				/>,
				{ wrapper: Wrapper },
			);

			const noDataContainer = screen
				.getByText('No Data')
				.closest('.uplot-no-data');
			expect(noDataContainer).toHaveStyle({ width: '750px', height: '350px' });
		});

		it('does not create a uPlot instance', () => {
			render(
				<UPlotChart
					config={createMockConfig() as any}
					data={emptyData}
					width={600}
					height={400}
				/>,
				{ wrapper: Wrapper },
			);

			expect(uPlotCtor).not.toHaveBeenCalled();
		});
	});

	describe('chart container', () => {
		it('renders children inside the chart wrapper', () => {
			render(
				<UPlotChart
					config={createMockConfig() as any}
					data={validData}
					width={600}
					height={400}
				>
					<div data-testid="tooltip-plugin">Tooltip</div>
				</UPlotChart>,
				{ wrapper: Wrapper },
			);

			expect(screen.getByTestId('tooltip-plugin')).toBeInTheDocument();
		});
	});

	describe('plot creation', () => {
		it('instantiates uPlot with floored dimensions and the container element', () => {
			render(
				<UPlotChart
					config={createMockConfig() as any}
					data={validData}
					width={600.9}
					height={400.2}
				/>,
				{ wrapper: Wrapper },
			);

			expect(uPlotCtor).toHaveBeenCalledTimes(1);

			const [opts, data, target] = uPlotCtor.mock.calls[0];
			expect(opts.width).toBe(600);
			expect(opts.height).toBe(400);
			expect(data).toBe(validData);
			expect(target).toBe(screen.getByTestId('uplot-main-div'));
		});

		it('merges config builder output into the uPlot options', () => {
			const config = createMockConfig();
			config.getConfig.mockReturnValue({
				series: [{ value: (): string => '' }],
				axes: [{ scale: 'y' }],
				scales: { y: {} },
				hooks: {},
				cursor: { show: true },
			});

			render(
				<UPlotChart
					config={config as any}
					data={validData}
					width={500}
					height={300}
				/>,
				{ wrapper: Wrapper },
			);

			const [opts] = uPlotCtor.mock.calls[0];
			expect(opts.width).toBe(500);
			expect(opts.height).toBe(300);
			expect(opts.axes).toEqual([{ scale: 'y' }]);
			expect(opts.cursor).toEqual({ show: true });
		});

		it('skips creation when width or height is 0', () => {
			render(
				<UPlotChart
					config={createMockConfig() as any}
					data={validData}
					width={0}
					height={0}
				/>,
				{ wrapper: Wrapper },
			);

			expect(uPlotCtor).not.toHaveBeenCalled();
		});
	});

	describe('lifecycle callbacks', () => {
		it('invokes plotRef with the uPlot instance after creation', () => {
			const plotRef = jest.fn();

			render(
				<UPlotChart
					config={createMockConfig() as any}
					data={validData}
					width={600}
					height={400}
					plotRef={plotRef}
				/>,
				{ wrapper: Wrapper },
			);

			expect(plotRef).toHaveBeenCalledTimes(1);
			expect(plotRef).toHaveBeenCalledWith(instances[0]);
		});

		it('destroys the instance and notifies callbacks when data becomes empty', () => {
			const plotRef = jest.fn();
			const onDestroy = jest.fn();
			const config = createMockConfig();

			const { rerender } = render(
				<UPlotChart
					config={config as any}
					data={validData}
					width={600}
					height={400}
					plotRef={plotRef}
					onDestroy={onDestroy}
				/>,
				{ wrapper: Wrapper },
			);

			const firstInstance = instances[0];
			plotRef.mockClear();

			rerender(
				<UPlotChart
					config={config as any}
					data={emptyData}
					width={600}
					height={400}
					plotRef={plotRef}
					onDestroy={onDestroy}
				/>,
			);

			expect(onDestroy).toHaveBeenCalledWith(firstInstance);
			expect(firstInstance.destroy).toHaveBeenCalled();
			expect(plotRef).toHaveBeenCalledWith(null);
			expect(screen.getByText('No Data')).toBeInTheDocument();
		});

		it('destroys the previous instance before creating a new one on config change', () => {
			const onDestroy = jest.fn();
			const config1 = createMockConfig();
			const config2 = createMockConfig();

			const { rerender } = render(
				<UPlotChart
					config={config1 as any}
					data={validData}
					width={600}
					height={400}
					onDestroy={onDestroy}
				/>,
				{ wrapper: Wrapper },
			);

			const firstInstance = instances[0];

			rerender(
				<UPlotChart
					config={config2 as any}
					data={validData}
					width={600}
					height={400}
					onDestroy={onDestroy}
				/>,
			);

			expect(onDestroy).toHaveBeenCalledWith(firstInstance);
			expect(firstInstance.destroy).toHaveBeenCalled();
			expect(instances).toHaveLength(2);
		});
	});

	describe('prop updates', () => {
		it('calls setData without recreating the plot when only data changes', () => {
			const config = createMockConfig();
			const newData: AlignedData = [
				[4, 5, 6],
				[40, 50, 60],
			];

			const { rerender } = render(
				<UPlotChart
					config={config as any}
					data={validData}
					width={600}
					height={400}
				/>,
				{ wrapper: Wrapper },
			);

			const inst = instances[0];

			rerender(
				<UPlotChart
					config={config as any}
					data={newData}
					width={600}
					height={400}
				/>,
			);

			expect(inst.setData).toHaveBeenCalledWith(newData);
			expect(uPlotCtor).toHaveBeenCalledTimes(1);
		});

		it('calls setSize with floored values when only dimensions change', () => {
			const config = createMockConfig();

			const { rerender } = render(
				<UPlotChart
					config={config as any}
					data={validData}
					width={600}
					height={400}
				/>,
				{ wrapper: Wrapper },
			);

			const inst = instances[0];

			rerender(
				<UPlotChart
					config={config as any}
					data={validData}
					width={800.7}
					height={500.3}
				/>,
			);

			expect(inst.setSize).toHaveBeenCalledWith({ width: 800, height: 500 });
			expect(uPlotCtor).toHaveBeenCalledTimes(1);
		});

		it('recreates the plot when config changes', () => {
			const config1 = createMockConfig();
			const config2 = createMockConfig();

			const { rerender } = render(
				<UPlotChart
					config={config1 as any}
					data={validData}
					width={600}
					height={400}
				/>,
				{ wrapper: Wrapper },
			);

			rerender(
				<UPlotChart
					config={config2 as any}
					data={validData}
					width={600}
					height={400}
				/>,
			);

			expect(uPlotCtor).toHaveBeenCalledTimes(2);
		});

		it('does nothing when all props remain the same', () => {
			const config = createMockConfig();

			const { rerender } = render(
				<UPlotChart
					config={config as any}
					data={validData}
					width={600}
					height={400}
				/>,
				{ wrapper: Wrapper },
			);

			const inst = instances[0];

			rerender(
				<UPlotChart
					config={config as any}
					data={validData}
					width={600}
					height={400}
				/>,
			);

			expect(uPlotCtor).toHaveBeenCalledTimes(1);
			expect(inst.setData).not.toHaveBeenCalled();
			expect(inst.setSize).not.toHaveBeenCalled();
		});
	});
});
