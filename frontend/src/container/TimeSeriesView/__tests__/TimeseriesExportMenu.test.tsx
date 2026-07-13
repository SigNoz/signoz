import { fireEvent, render, screen } from 'tests/test-utils';
import { QueryRangeResponseV5 } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import TimeseriesExportMenu from '../TimeseriesExportMenu';

const mockHandleExport = jest.fn();
let mockIsExporting = false;

jest.mock('hooks/useExportData/useClientExport', () => ({
	useClientExport: (): unknown => ({
		isExporting: mockIsExporting,
		handleExport: mockHandleExport,
	}),
}));

const response = {
	type: 'time_series',
	data: { results: [] },
	meta: {},
} as unknown as QueryRangeResponseV5;

const TEST_ID = `timeseries-export-${DataSource.LOGS}`;

function renderMenu(): void {
	render(
		<TimeseriesExportMenu
			dataSource={DataSource.LOGS}
			queryResponse={response}
			fileName="logs-timeseries"
		/>,
	);
}

describe('TimeseriesExportMenu', () => {
	beforeEach(() => {
		mockHandleExport.mockReset();
		mockIsExporting = false;
	});

	it('renders the download trigger button', () => {
		renderMenu();
		expect(screen.getByTestId(TEST_ID)).toBeInTheDocument();
	});

	it('shows only format options — no shape, row-count, or column controls', () => {
		renderMenu();
		fireEvent.click(screen.getByTestId(TEST_ID));

		expect(screen.getByText('FORMAT')).toBeInTheDocument();
		expect(screen.getByRole('radio', { name: 'csv' })).toBeInTheDocument();
		expect(screen.getByRole('radio', { name: 'jsonl' })).toBeInTheDocument();

		expect(screen.queryByText('Number of Rows')).not.toBeInTheDocument();
		expect(screen.queryByText('Columns')).not.toBeInTheDocument();
		expect(screen.queryByRole('radio', { name: 'long' })).not.toBeInTheDocument();
		expect(screen.queryByRole('radio', { name: 'wide' })).not.toBeInTheDocument();
	});

	it('exports as csv by default', () => {
		renderMenu();
		fireEvent.click(screen.getByTestId(TEST_ID));
		fireEvent.click(screen.getByText('Export'));

		expect(mockHandleExport).toHaveBeenCalledTimes(1);
		expect(mockHandleExport).toHaveBeenCalledWith({ format: 'csv' });
	});

	it('exports as jsonl when selected', () => {
		renderMenu();
		fireEvent.click(screen.getByTestId(TEST_ID));
		fireEvent.click(screen.getByRole('radio', { name: 'jsonl' }));
		fireEvent.click(screen.getByText('Export'));

		expect(mockHandleExport).toHaveBeenCalledWith({ format: 'jsonl' });
	});

	it('disables the trigger while an export is in progress', () => {
		mockIsExporting = true;
		renderMenu();

		expect(screen.getByTestId(TEST_ID)).toBeDisabled();
	});
});
