import { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import { fireEvent, render, screen } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import ExportMenu from '../ExportMenu';

const mockHandleExport = jest.fn();
let mockIsExporting = false;

jest.mock('hooks/useExportData/useClientExport', () => ({
	useClientExport: (): unknown => ({
		isExporting: mockIsExporting,
		handleExport: mockHandleExport,
	}),
}));

const data = {
	statusCode: 200,
	error: null,
	message: '',
	payload: { data: { result: [], resultType: 'time_series' } },
} as unknown as MetricQueryRangeSuccessResponse;

const TEST_ID = `export-menu-${DataSource.LOGS}`;

function renderMenu(): void {
	render(
		<ExportMenu
			dataSource={DataSource.LOGS}
			data={data}
			fileName="logs-timeseries"
		/>,
	);
}

describe('ExportMenu', () => {
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
