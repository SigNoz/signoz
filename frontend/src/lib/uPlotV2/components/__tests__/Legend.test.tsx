import React from 'react';
import {
	fireEvent,
	render,
	RenderResult,
	screen,
	within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LegendItem } from 'lib/uPlotV2/config/types';
import useLegendsSync from 'lib/uPlotV2/hooks/useLegendsSync';

import { useLegendActions } from '../../hooks/useLegendActions';
import Legend from '../Legend/Legend';
import { LegendPosition } from '../types';

const mockWriteText = jest.fn().mockResolvedValue(undefined);
let clipboardSpy: jest.SpyInstance | undefined;

jest.mock('react-virtuoso', () => ({
	VirtuosoGrid: ({
		data,
		itemContent,
		className,
	}: {
		data: LegendItem[];
		itemContent: (index: number, item: LegendItem) => React.ReactNode;
		className?: string;
	}): JSX.Element => (
		<div data-testid="virtuoso-grid" className={className}>
			{data.map((item, index) => (
				<div key={item.seriesIndex ?? index} data-testid="legend-item-wrapper">
					{itemContent(index, item)}
				</div>
			))}
		</div>
	),
}));

jest.mock('lib/uPlotV2/hooks/useLegendsSync');
jest.mock('lib/uPlotV2/hooks/useLegendActions');

const mockUseLegendsSync = useLegendsSync as jest.MockedFunction<
	typeof useLegendsSync
>;
const mockUseLegendActions = useLegendActions as jest.MockedFunction<
	typeof useLegendActions
>;

describe('Legend', () => {
	beforeAll(() => {
		// JSDOM does not define navigator.clipboard; add it so we can spy on writeText
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText: () => Promise.resolve() },
			writable: true,
			configurable: true,
		});
	});

	const baseLegendItemsMap = {
		0: {
			seriesIndex: 0,
			label: 'A',
			show: true,
			color: '#ff0000',
		},
		1: {
			seriesIndex: 1,
			label: 'B',
			show: false,
			color: '#00ff00',
		},
		2: {
			seriesIndex: 2,
			label: 'C',
			show: true,
			color: '#0000ff',
		},
	};

	let onLegendClick: jest.Mock;
	let onLegendMouseMove: jest.Mock;
	let onLegendMouseLeave: jest.Mock;
	let onFocusSeries: jest.Mock;

	beforeEach(() => {
		onLegendClick = jest.fn();
		onLegendMouseMove = jest.fn();
		onLegendMouseLeave = jest.fn();
		onFocusSeries = jest.fn();
		mockWriteText.mockClear();

		clipboardSpy = jest
			.spyOn(navigator.clipboard, 'writeText')
			.mockImplementation(mockWriteText);

		mockUseLegendsSync.mockReturnValue({
			legendItemsMap: baseLegendItemsMap,
			focusedSeriesIndex: 1,
			setFocusedSeriesIndex: jest.fn(),
		});

		mockUseLegendActions.mockReturnValue({
			onLegendClick,
			onLegendMouseMove,
			onLegendMouseLeave,
			onFocusSeries,
		});
	});

	afterEach(() => {
		clipboardSpy?.mockRestore();
		jest.clearAllMocks();
	});

	const renderLegend = (position?: LegendPosition): RenderResult =>
		render(
			<Legend
				position={position}
				// config is not used directly in the component, it's consumed by the mocked hook
				config={{} as any}
			/>,
		);

	describe('layout and position', () => {
		it('renders search input when legend position is RIGHT', () => {
			renderLegend(LegendPosition.RIGHT);

			expect(screen.getByTestId('legend-search-input')).toBeInTheDocument();
		});

		it('does not render search input when legend position is BOTTOM (default)', () => {
			renderLegend();

			expect(screen.queryByTestId('legend-search-input')).not.toBeInTheDocument();
		});

		it('renders the marker with the correct border color', () => {
			renderLegend(LegendPosition.RIGHT);

			const legendMarker = document.querySelector(
				'[data-legend-item-id="0"] [data-is-legend-marker="true"]',
			) as HTMLElement;

			expect(legendMarker).toHaveStyle({
				'border-color': '#ff0000',
			});
		});

		it('renders all legend items in the grid by default', () => {
			renderLegend(LegendPosition.RIGHT);

			expect(screen.getByTestId('virtuoso-grid')).toBeInTheDocument();
			expect(screen.getByText('A')).toBeInTheDocument();
			expect(screen.getByText('B')).toBeInTheDocument();
			expect(screen.getByText('C')).toBeInTheDocument();
		});
	});

	describe('search behavior (RIGHT position)', () => {
		it('filters legend items based on search query (case-insensitive)', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			const searchInput = screen.getByTestId('legend-search-input');
			await user.type(searchInput, 'A');

			expect(screen.getByText('A')).toBeInTheDocument();
			expect(screen.queryByText('B')).not.toBeInTheDocument();
			expect(screen.queryByText('C')).not.toBeInTheDocument();
		});

		it('shows empty state when no legend items match the search query', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			const searchInput = screen.getByTestId('legend-search-input');
			await user.type(searchInput, 'network');

			expect(
				screen.getByText(/No series found matching "network"/i),
			).toBeInTheDocument();
			expect(screen.queryByTestId('virtuoso-grid')).not.toBeInTheDocument();
		});

		it('does not filter or show empty state when search query is empty or only whitespace', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			const searchInput = screen.getByTestId('legend-search-input');
			await user.type(searchInput, '   ');

			expect(
				screen.queryByText(/No series found matching/i),
			).not.toBeInTheDocument();
			expect(screen.getByText('A')).toBeInTheDocument();
			expect(screen.getByText('B')).toBeInTheDocument();
			expect(screen.getByText('C')).toBeInTheDocument();
		});
	});

	describe('legend actions', () => {
		it('calls onLegendClick when a legend item is clicked', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			await user.click(screen.getByText('A'));

			expect(onLegendClick).toHaveBeenCalledTimes(1);
		});

		it('calls mouseMove when the mouse moves over a legend item', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			const legendItem = document.querySelector(
				'[data-legend-item-id="0"]',
			) as HTMLElement;

			await user.hover(legendItem);

			expect(onLegendMouseMove).toHaveBeenCalledTimes(1);
		});

		it('calls onLegendMouseLeave when the mouse leaves the legend container', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			const container = document.querySelector('.legend-container') as HTMLElement;

			await user.hover(container);
			await user.unhover(container);

			expect(onLegendMouseLeave).toHaveBeenCalledTimes(1);
		});
	});

	describe('copy action', () => {
		it('copies the legend label to clipboard when copy button is clicked', () => {
			renderLegend(LegendPosition.RIGHT);

			const firstLegendItem = document.querySelector(
				'[data-legend-item-id="0"]',
			) as HTMLElement;
			const copyButton = within(firstLegendItem).getByTestId('legend-copy');

			fireEvent.click(copyButton);

			expect(mockWriteText).toHaveBeenCalledTimes(1);
			expect(mockWriteText).toHaveBeenCalledWith('A');
		});

		it('copies the correct label when copy is clicked on a different legend item', () => {
			renderLegend(LegendPosition.RIGHT);

			const thirdLegendItem = document.querySelector(
				'[data-legend-item-id="2"]',
			) as HTMLElement;
			const copyButton = within(thirdLegendItem).getByTestId('legend-copy');

			fireEvent.click(copyButton);

			expect(mockWriteText).toHaveBeenCalledTimes(1);
			expect(mockWriteText).toHaveBeenCalledWith('C');
		});

		it('does not call onLegendClick when copy button is clicked', () => {
			renderLegend(LegendPosition.RIGHT);

			const firstLegendItem = document.querySelector(
				'[data-legend-item-id="0"]',
			) as HTMLElement;
			const copyButton = within(firstLegendItem).getByTestId('legend-copy');

			fireEvent.click(copyButton);

			expect(onLegendClick).not.toHaveBeenCalled();
		});
	});
});
