import '@testing-library/jest-dom';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import { downloadExportData } from 'api/v1/download/downloadExportData';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { DownloadFormats, DownloadRowCounts } from './constants';
import LogsDownloadOptionsMenu from './LogsDownloadOptionsMenu';

// Mock the downloadExportData API and antd message
jest.mock('api/v1/download/downloadExportData');
jest.mock('antd', () => {
	const actual = jest.requireActual('antd');
	return {
		...actual,
		message: {
			success: jest.fn(),
			error: jest.fn(),
		},
	};
});

const mockDownloadExportData = downloadExportData as jest.MockedFunction<
	typeof downloadExportData
>;

const TEST_IDS = {
	DOWNLOAD_BUTTON: 'periscope-btn-download-options',
} as const;

interface TestProps {
	startTime: number;
	endTime: number;
	filter: string;
	columns: TelemetryFieldKey[];
	orderBy: string;
}

const createTestProps = (): TestProps => ({
	startTime: 1631234567890,
	endTime: 1631234567999,
	filter: 'status = 200',
	columns: [
		{
			name: 'http.status',
			fieldContext: 'attribute',
			fieldDataType: 'int64',
		} as TelemetryFieldKey,
	],
	orderBy: 'timestamp:desc',
});

const testRenderContent = (props: TestProps): void => {
	render(
		<LogsDownloadOptionsMenu
			startTime={props.startTime}
			endTime={props.endTime}
			filter={props.filter}
			columns={props.columns}
			orderBy={props.orderBy}
		/>,
	);
};

describe('LogsDownloadOptionsMenu', () => {
	beforeEach(() => {
		mockDownloadExportData.mockReset();
		mockDownloadExportData.mockResolvedValue();
		(message.success as jest.Mock).mockReset();
		(message.error as jest.Mock).mockReset();
	});

	it('renders download button', () => {
		const props = createTestProps();
		testRenderContent(props);

		const button = screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON);
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass('periscope-btn', 'ghost');
	});

	it('shows popover with export options when download button is clicked', () => {
		const props = createTestProps();
		render(
			<LogsDownloadOptionsMenu
				startTime={props.startTime}
				endTime={props.endTime}
				filter={props.filter}
				columns={props.columns}
				orderBy={props.orderBy}
			/>,
		);

		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('FORMAT')).toBeInTheDocument();
		expect(screen.getByText('Number of Rows')).toBeInTheDocument();
		expect(screen.getByText('Columns')).toBeInTheDocument();
	});

	it('allows changing export format', () => {
		const props = createTestProps();
		testRenderContent(props);
		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));

		const csvRadio = screen.getByRole('radio', { name: 'csv' });
		const jsonlRadio = screen.getByRole('radio', { name: 'jsonl' });

		expect(csvRadio).toBeChecked();
		fireEvent.click(jsonlRadio);
		expect(jsonlRadio).toBeChecked();
		expect(csvRadio).not.toBeChecked();
	});

	it('allows changing row limit', () => {
		const props = createTestProps();
		testRenderContent(props);

		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));

		const tenKRadio = screen.getByRole('radio', { name: '10k' });
		const fiftyKRadio = screen.getByRole('radio', { name: '50k' });

		expect(tenKRadio).toBeChecked();
		fireEvent.click(fiftyKRadio);
		expect(fiftyKRadio).toBeChecked();
		expect(tenKRadio).not.toBeChecked();
	});

	it('allows changing columns scope', () => {
		const props = createTestProps();
		testRenderContent(props);
		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));

		const allColumnsRadio = screen.getByRole('radio', { name: 'All' });
		const selectedColumnsRadio = screen.getByRole('radio', { name: 'Selected' });

		expect(allColumnsRadio).toBeChecked();
		fireEvent.click(selectedColumnsRadio);
		expect(selectedColumnsRadio).toBeChecked();
		expect(allColumnsRadio).not.toBeChecked();
	});

	it('calls downloadExportData with correct parameters when export button is clicked', async () => {
		const props = createTestProps();
		testRenderContent(props);
		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));
		fireEvent.click(screen.getByRole('radio', { name: 'Selected' }));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(mockDownloadExportData).toHaveBeenCalledWith({
				source: 'logs',
				start: props.startTime,
				end: props.endTime,
				columns: ['attribute.http.status:int64'],
				filter: props.filter,
				orderBy: props.orderBy,
				format: DownloadFormats.CSV,
				limit: DownloadRowCounts.TEN_K,
			});
		});
	});

	it('calls downloadExportData with correct parameters when export button is clicked', async () => {
		const props = createTestProps();
		testRenderContent(props);

		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));
		fireEvent.click(screen.getByRole('radio', { name: 'All' }));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(mockDownloadExportData).toHaveBeenCalledWith({
				source: 'logs',
				start: props.startTime,
				end: props.endTime,
				columns: [],
				filter: props.filter,
				orderBy: props.orderBy,
				format: DownloadFormats.CSV,
				limit: DownloadRowCounts.TEN_K,
			});
		});
	});

	it('handles successful export with success message', async () => {
		mockDownloadExportData.mockResolvedValueOnce();
		const props = createTestProps();
		testRenderContent(props);

		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(message.success).toHaveBeenCalledWith(
				'Export completed successfully',
			);
		});
	});

	it('handles export failure with error message', async () => {
		mockDownloadExportData.mockRejectedValueOnce(new Error('Export failed'));
		const props = createTestProps();
		testRenderContent(props);

		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(message.error).toHaveBeenCalledWith(
				'Failed to export logs. Please try again.',
			);
		});
	});

	it('handles UI state correctly during export process', async () => {
		mockDownloadExportData.mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 100);
				}),
		);
		const props = createTestProps();
		testRenderContent(props);

		// Open popover
		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		// Start export
		fireEvent.click(screen.getByText('Export'));

		// Check button is disabled during export
		expect(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON)).toBeDisabled();

		// Check popover is closed immediately after export starts
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		// Wait for export to complete and verify button is enabled again
		await waitFor(() => {
			expect(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON)).not.toBeDisabled();
		});
	});
});
