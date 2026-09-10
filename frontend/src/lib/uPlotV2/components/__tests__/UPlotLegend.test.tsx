import React from 'react';
import { render, RenderResult, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { LegendItem } from 'lib/uPlotV2/config/types';
import useLegendsSync from 'lib/uPlotV2/hooks/useLegendsSync';

import { useLegendActions } from '../../hooks/useLegendActions';
import UPlotLegend from '../Legend/UPlotLegend';
import { LegendPosition } from '../types';

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

describe('UPlotLegend', () => {
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

	let onToggleSeries: jest.Mock;
	let onShowOnlySeries: jest.Mock;
	let onShowSeries: jest.Mock;
	let onHoverSeries: jest.Mock;

	beforeEach(() => {
		onToggleSeries = jest.fn();
		onShowOnlySeries = jest.fn();
		onShowSeries = jest.fn();
		onHoverSeries = jest.fn();

		mockUseLegendsSync.mockReturnValue({
			legendItemsMap: baseLegendItemsMap,
			focusedSeriesIndex: 1,
			setFocusedSeriesIndex: jest.fn(),
		});

		mockUseLegendActions.mockReturnValue({
			onToggleSeries,
			onShowOnlySeries,
			onShowSeries,
			onHoverSeries,
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const renderLegend = (position?: LegendPosition): RenderResult =>
		render(
			<TooltipProvider>
				<UPlotLegend
					position={position}
					// config is consumed by the mocked useLegendsSync hook, not directly
					config={{} as any}
				/>
			</TooltipProvider>,
		);

	describe('layout and position', () => {
		it('renders the search input on a RIGHT legend', () => {
			renderLegend(LegendPosition.RIGHT);

			expect(screen.getByTestId('legend-search-input')).toBeInTheDocument();
		});

		it('keeps a BOTTOM legend bare — its two rows all go to series', () => {
			renderLegend();

			expect(screen.queryByTestId('legend-search-input')).not.toBeInTheDocument();
			expect(screen.queryByTestId('legend-status')).not.toBeInTheDocument();
			// The row interactions are the same in both placements.
			expect(screen.getByTestId('legend-item-0')).toBeInTheDocument();
			expect(screen.getByTestId('legend-only-0')).toBeInTheDocument();
		});

		it('renders the marker with the series colour, filled only when shown', () => {
			renderLegend(LegendPosition.RIGHT);

			expect(
				document.querySelector(
					'[data-legend-item-id="0"] [data-is-legend-marker="true"]',
				),
			).toHaveStyle({
				'border-color': '#ff0000',
				'background-color': '#ff0000',
			});
			// Hidden series read as an empty checkbox.
			expect(
				document.querySelector(
					'[data-legend-item-id="1"] [data-is-legend-marker="true"]',
				),
			).toHaveStyle({ 'background-color': 'transparent' });
		});

		it('renders all legend items in the grid by default', () => {
			renderLegend(LegendPosition.RIGHT);

			expect(screen.getByTestId('virtuoso-grid')).toBeInTheDocument();
			expect(screen.getByText('A')).toBeInTheDocument();
			expect(screen.getByText('B')).toBeInTheDocument();
			expect(screen.getByText('C')).toBeInTheDocument();
		});
	});

	describe('status readout', () => {
		it('reports how many series are showing', () => {
			renderLegend(LegendPosition.RIGHT);

			expect(screen.getByTestId('legend-status')).toHaveTextContent(
				'Showing 2 of 3 series',
			);
		});
	});

	describe('filter behavior', () => {
		it('filters legend items based on the query (case-insensitive)', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			await user.type(screen.getByTestId('legend-search-input'), 'a');

			expect(screen.getByText('A')).toBeInTheDocument();
			expect(screen.queryByText('B')).not.toBeInTheDocument();
			expect(screen.queryByText('C')).not.toBeInTheDocument();
		});

		it('shows the empty state when nothing matches', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			await user.type(screen.getByTestId('legend-search-input'), 'network');

			expect(
				screen.getByText(/No series found matching "network"/i),
			).toBeInTheDocument();
			expect(screen.queryByTestId('virtuoso-grid')).not.toBeInTheDocument();
		});

		it('ignores a whitespace-only query', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			await user.type(screen.getByTestId('legend-search-input'), '   ');

			expect(
				screen.queryByText(/No series found matching/i),
			).not.toBeInTheDocument();
			expect(screen.getByText('A')).toBeInTheDocument();
			expect(screen.getByText('B')).toBeInTheDocument();
			expect(screen.getByText('C')).toBeInTheDocument();
		});
	});

	describe('row interactions', () => {
		const allShownItemsMap = {
			0: { ...baseLegendItemsMap[0] },
			1: { ...baseLegendItemsMap[1], show: true },
			2: { ...baseLegendItemsMap[2] },
		};

		const mockAllShown = (): void => {
			mockUseLegendsSync.mockReturnValue({
				legendItemsMap: allShownItemsMap,
				focusedSeriesIndex: null,
				setFocusedSeriesIndex: jest.fn(),
			});
		};

		it('isolates the series when everything is showing', async () => {
			const user = userEvent.setup();
			mockAllShown();
			renderLegend(LegendPosition.RIGHT);

			await user.click(screen.getByText('A'));

			// Nothing the user can see is there to exclude, so the click means Only.
			expect(onShowOnlySeries).toHaveBeenCalledWith(0);
			expect(onToggleSeries).not.toHaveBeenCalled();
		});

		it('toggles the series once something is already hidden', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			await user.click(screen.getByText('A'));

			expect(onToggleSeries).toHaveBeenCalledWith(0);
			expect(onShowOnlySeries).not.toHaveBeenCalled();
		});

		it('excludes just that series when its marker is clicked', async () => {
			const user = userEvent.setup();
			mockAllShown();
			renderLegend(LegendPosition.RIGHT);

			await user.click(screen.getByTestId('legend-marker-0'));

			// The marker is the one way to exclude a single series while
			// everything is showing — the row click isolates instead.
			expect(onToggleSeries).toHaveBeenCalledWith(0);
			expect(onShowOnlySeries).not.toHaveBeenCalled();
		});

		it('stops the marker offering to hide the last series showing', () => {
			mockUseLegendsSync.mockReturnValue({
				legendItemsMap: {
					0: { ...baseLegendItemsMap[0] },
					1: { ...baseLegendItemsMap[1] },
					2: { ...baseLegendItemsMap[2], show: false },
				},
				focusedSeriesIndex: null,
				setFocusedSeriesIndex: jest.fn(),
			});
			renderLegend(LegendPosition.RIGHT);

			expect(screen.getByTestId('legend-marker-0')).toBeDisabled();
			expect(screen.getByTestId('legend-marker-1')).toBeEnabled();
		});

		it('labels the marker with what clicking it does', () => {
			renderLegend(LegendPosition.RIGHT);

			expect(screen.getByTestId('legend-marker-0')).toHaveAttribute(
				'aria-label',
				'Hide A',
			);
			expect(screen.getByTestId('legend-marker-1')).toHaveAttribute(
				'aria-label',
				'Show B',
			);
		});

		it('moves the isolation when another row is clicked while one is alone', async () => {
			const user = userEvent.setup();
			mockUseLegendsSync.mockReturnValue({
				legendItemsMap: {
					0: { ...baseLegendItemsMap[0] },
					1: { ...baseLegendItemsMap[1] },
					2: { ...baseLegendItemsMap[2], show: false },
				},
				focusedSeriesIndex: null,
				setFocusedSeriesIndex: jest.fn(),
			});
			renderLegend(LegendPosition.RIGHT);

			// Series 0 is showing alone; clicking another row swaps to it rather
			// than adding it — Add is there for keeping both.
			await user.click(screen.getByText('B'));

			expect(onShowOnlySeries).toHaveBeenCalledWith(1);
			expect(onToggleSeries).not.toHaveBeenCalled();
		});

		it('puts everything back when the series showing alone is clicked', async () => {
			const user = userEvent.setup();
			mockUseLegendsSync.mockReturnValue({
				legendItemsMap: {
					0: { ...baseLegendItemsMap[0] },
					1: { ...baseLegendItemsMap[1] },
					2: { ...baseLegendItemsMap[2], show: false },
				},
				focusedSeriesIndex: null,
				setFocusedSeriesIndex: jest.fn(),
			});
			renderLegend(LegendPosition.RIGHT);

			await user.click(screen.getByText('A'));

			// Only clears the isolation, however the legend came to be isolated.
			expect(onShowOnlySeries).toHaveBeenCalledWith(0);
			expect(onToggleSeries).not.toHaveBeenCalled();
		});

		it('toggles the series on Enter and Space', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			const row = screen.getByTestId('legend-item-0');
			row.focus();
			await user.keyboard('{Enter}');
			await user.keyboard(' ');

			expect(onToggleSeries).toHaveBeenCalledTimes(2);
			expect(onToggleSeries).toHaveBeenCalledWith(0);
		});

		it('reflects visibility on the row for assistive tech', () => {
			renderLegend(LegendPosition.RIGHT);

			expect(screen.getByTestId('legend-item-0')).toHaveAttribute(
				'aria-checked',
				'true',
			);
			expect(screen.getByTestId('legend-item-1')).toHaveAttribute(
				'aria-checked',
				'false',
			);
		});

		it('isolates the series from Only without also toggling the row', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			await user.click(screen.getByTestId('legend-only-0'));

			expect(onShowOnlySeries).toHaveBeenCalledWith(0);
			expect(onToggleSeries).not.toHaveBeenCalled();
		});

		it('highlights the hovered series and clears it on leave', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			const row = screen.getByTestId('legend-item-0');
			await user.hover(row);
			expect(onHoverSeries).toHaveBeenCalledWith(0);

			await user.unhover(row);
			expect(onHoverSeries).toHaveBeenCalledWith(null);
		});
	});

	describe('one-series state', () => {
		const soleShownItemsMap = {
			0: { ...baseLegendItemsMap[0] },
			1: { ...baseLegendItemsMap[1] },
			2: { ...baseLegendItemsMap[2], show: false },
		};

		beforeEach(() => {
			mockUseLegendsSync.mockReturnValue({
				legendItemsMap: soleShownItemsMap,
				focusedSeriesIndex: null,
				setFocusedSeriesIndex: jest.fn(),
			});
		});

		it('lights Only on the series that is showing alone', () => {
			renderLegend(LegendPosition.RIGHT);

			expect(screen.getByTestId('legend-only-0')).toHaveAttribute(
				'aria-pressed',
				'true',
			);
			expect(screen.getByTestId('legend-only-1')).toHaveAttribute(
				'aria-pressed',
				'false',
			);
		});

		it('offers Add on the hidden rows, not the one that is showing', async () => {
			const user = userEvent.setup();
			renderLegend(LegendPosition.RIGHT);

			expect(screen.queryByTestId('legend-add-0')).not.toBeInTheDocument();

			await user.click(screen.getByTestId('legend-add-1'));

			expect(onShowSeries).toHaveBeenCalledWith(1);
			expect(onToggleSeries).not.toHaveBeenCalled();
		});

		it('keeps Add on every hidden row however many are showing', () => {
			mockUseLegendsSync.mockReturnValue({
				legendItemsMap: {
					0: { ...baseLegendItemsMap[0] },
					1: { ...baseLegendItemsMap[1] },
					2: { ...baseLegendItemsMap[2], show: false },
				},
				focusedSeriesIndex: null,
				setFocusedSeriesIndex: jest.fn(),
			});
			renderLegend(LegendPosition.RIGHT);

			// Two shown, two hidden: both hidden rows can still be added.
			expect(screen.getByTestId('legend-add-1')).toBeInTheDocument();
			expect(screen.getByTestId('legend-add-2')).toBeInTheDocument();
			expect(screen.queryByTestId('legend-add-0')).not.toBeInTheDocument();
		});
	});
});
