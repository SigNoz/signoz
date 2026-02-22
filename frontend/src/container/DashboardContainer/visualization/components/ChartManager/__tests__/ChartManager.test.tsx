import userEvent from '@testing-library/user-event';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { render, screen } from 'tests/test-utils';

import ChartManager from '../ChartManager';

const mockSyncSeriesVisibilityToLocalStorage = jest.fn();
const mockNotificationsSuccess = jest.fn();

jest.mock('lib/uPlotV2/context/PlotContext', () => ({
	usePlotContext: (): {
		onToggleSeriesOnOff: jest.Mock;
		onToggleSeriesVisibility: jest.Mock;
		syncSeriesVisibilityToLocalStorage: jest.Mock;
	} => ({
		onToggleSeriesOnOff: jest.fn(),
		onToggleSeriesVisibility: jest.fn(),
		syncSeriesVisibilityToLocalStorage: mockSyncSeriesVisibilityToLocalStorage,
	}),
}));

jest.mock('lib/uPlotV2/hooks/useLegendsSync', () => ({
	__esModule: true,
	default: (): {
		legendItemsMap: { [key: number]: { show: boolean; label: string } };
	} => ({
		legendItemsMap: {
			0: { show: true, label: 'Time' },
			1: { show: true, label: 'Series 1' },
			2: { show: true, label: 'Series 2' },
		},
	}),
}));

jest.mock('providers/Dashboard/Dashboard', () => ({
	useDashboard: (): { isDashboardLocked: boolean } => ({
		isDashboardLocked: false,
	}),
}));

jest.mock('hooks/useNotifications', () => ({
	useNotifications: (): { notifications: { success: jest.Mock } } => ({
		notifications: {
			success: mockNotificationsSuccess,
		},
	}),
}));

jest.mock('components/ResizeTable', () => {
	const MockTable = ({
		dataSource,
		columns,
	}: {
		dataSource: { index: number; label?: string }[];
		columns: { key: string; title: string }[];
	}): JSX.Element => (
		<div data-testid="resize-table">
			{columns.map((col) => (
				<span key={col.key}>{col.title}</span>
			))}
			{dataSource.map((row) => (
				<div key={row.index} data-testid={`row-${row.index}`}>
					{row.label}
				</div>
			))}
		</div>
	);
	return { ResizeTable: MockTable };
});

const createMockConfig = (): { getConfig: () => uPlot.Options } => ({
	getConfig: (): uPlot.Options => ({
		width: 100,
		height: 100,
		series: [
			{ label: 'Time', value: 'time' },
			{ label: 'Series 1', scale: 'y' },
			{ label: 'Series 2', scale: 'y' },
		],
	}),
});

const createAlignedData = (): uPlot.AlignedData => [
	[1000, 2000, 3000],
	[10, 20, 30],
	[1, 2, 3],
];

describe('ChartManager', () => {
	const mockOnCancel = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders filter input and action buttons', () => {
		render(
			<ChartManager
				config={createMockConfig() as any}
				alignedData={createAlignedData()}
				onCancel={mockOnCancel}
			/>,
		);

		expect(screen.getByPlaceholderText('Filter Series')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
	});

	it('renders ResizeTable with data', () => {
		render(
			<ChartManager
				config={createMockConfig() as UPlotConfigBuilder}
				alignedData={createAlignedData()}
			/>,
		);

		expect(screen.getByTestId('resize-table')).toBeInTheDocument();
	});

	it('calls onCancel when Cancel button is clicked', async () => {
		render(
			<ChartManager
				config={createMockConfig() as UPlotConfigBuilder}
				alignedData={createAlignedData()}
				onCancel={mockOnCancel}
			/>,
		);

		await userEvent.click(screen.getByTestId('cancel-button'));

		expect(mockOnCancel).toHaveBeenCalledTimes(1);
	});

	it('filters table data when typing in filter input', async () => {
		render(
			<ChartManager
				config={createMockConfig() as UPlotConfigBuilder}
				alignedData={createAlignedData()}
			/>,
		);

		// Before filter: both Series 1 and Series 2 rows are visible
		expect(screen.getByTestId('row-1')).toBeInTheDocument();
		expect(screen.getByTestId('row-2')).toBeInTheDocument();

		const filterInput = screen.getByTestId('filter-input');
		await userEvent.type(filterInput, 'Series 1');

		// After filter: only Series 1 row is visible, Series 2 row is filtered out
		expect(screen.getByTestId('row-1')).toBeInTheDocument();
		expect(screen.queryByTestId('row-2')).not.toBeInTheDocument();
	});

	it('calls syncSeriesVisibilityToLocalStorage, notifications.success, and onCancel when Save is clicked', async () => {
		render(
			<ChartManager
				config={createMockConfig() as UPlotConfigBuilder}
				alignedData={createAlignedData()}
				onCancel={mockOnCancel}
			/>,
		);

		await userEvent.click(screen.getByTestId('save-button'));

		expect(mockSyncSeriesVisibilityToLocalStorage).toHaveBeenCalledTimes(1);
		expect(mockNotificationsSuccess).toHaveBeenCalledWith({
			message: 'The updated graphs & legends are saved',
		});
		expect(mockOnCancel).toHaveBeenCalledTimes(1);
	});
});
