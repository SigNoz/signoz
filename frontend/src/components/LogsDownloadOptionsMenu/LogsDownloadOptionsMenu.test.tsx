import '@testing-library/jest-dom';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { DownloadFormats, DownloadRowCounts } from './constants';
import LogsDownloadOptionsMenu from './LogsDownloadOptionsMenu';

// Mock antd message
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

const testSuccessResponse = (res: any, ctx: any): any =>
	res(
		ctx.status(200),
		ctx.set('Content-Type', 'application/octet-stream'),
		ctx.set('Content-Disposition', 'attachment; filename="export.csv"'),
		ctx.body('id,value\n1,2\n'),
	);

describe('LogsDownloadOptionsMenu', () => {
	const BASE_URL = ENVIRONMENT.baseURL;
	const EXPORT_URL = `${BASE_URL}/api/v1/export_raw_data`;
	let requestSpy: jest.Mock<any, any>;
	const setupDefaultServer = (): void => {
		server.use(
			rest.get(EXPORT_URL, (req, res, ctx) => {
				const params = req.url.searchParams;
				const payload = {
					start: Number(params.get('start')),
					end: Number(params.get('end')),
					filter: params.get('filter'),
					columns: params.getAll('columns'),
					order_by: params.get('order_by'),
					limit: Number(params.get('limit')),
					format: params.get('format'),
				};
				requestSpy(payload);
				return testSuccessResponse(res, ctx);
			}),
		);
	};

	// Mock URL.createObjectURL used by download logic
	const originalCreateObjectURL = URL.createObjectURL;
	const originalRevokeObjectURL = URL.revokeObjectURL;

	beforeEach(() => {
		requestSpy = jest.fn();
		setupDefaultServer();
		(message.success as jest.Mock).mockReset();
		(message.error as jest.Mock).mockReset();
		// jsdom doesn't implement it by default
		((URL as unknown) as {
			createObjectURL: (b: Blob) => string;
		}).createObjectURL = jest.fn(() => 'blob:mock');
		((URL as unknown) as {
			revokeObjectURL: (u: string) => void;
		}).revokeObjectURL = jest.fn();
	});

	beforeAll(() => {
		server.listen();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	afterAll(() => {
		server.close();
		// restore
		URL.createObjectURL = originalCreateObjectURL;
		URL.revokeObjectURL = originalRevokeObjectURL;
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

	it('calls downloadExportData with correct parameters when export button is clicked (Selected columns)', async () => {
		const props = createTestProps();
		testRenderContent(props);
		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));
		fireEvent.click(screen.getByRole('radio', { name: 'Selected' }));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(requestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					start: props.startTime,
					end: props.endTime,
					columns: ['attribute.http.status:int64'],
					filter: props.filter,
					order_by: props.orderBy,
					format: DownloadFormats.CSV,
					limit: DownloadRowCounts.TEN_K,
				}),
			);
		});
	});

	it('calls downloadExportData with correct parameters when export button is clicked', async () => {
		const props = createTestProps();
		testRenderContent(props);

		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));
		fireEvent.click(screen.getByRole('radio', { name: 'All' }));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(requestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					start: props.startTime,
					end: props.endTime,
					columns: [],
					filter: props.filter,
					order_by: props.orderBy,
					format: DownloadFormats.CSV,
					limit: DownloadRowCounts.TEN_K,
				}),
			);
		});
	});

	it('handles successful export with success message', async () => {
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
		// Override handler to return 500 for this test
		server.use(rest.get(EXPORT_URL, (_req, res, ctx) => res(ctx.status(500))));
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
		server.use(
			rest.get(EXPORT_URL, (_req, res, ctx) => testSuccessResponse(res, ctx)),
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

	it('uses filename from Content-Disposition and triggers download click', async () => {
		server.use(
			rest.get(EXPORT_URL, (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.set('Content-Type', 'application/octet-stream'),
					ctx.set('Content-Disposition', 'attachment; filename="report.jsonl"'),
					ctx.body('row\n'),
				),
			),
		);

		const originalCreateElement = document.createElement.bind(document);
		const anchorEl = originalCreateElement('a') as HTMLAnchorElement;
		const setAttrSpy = jest.spyOn(anchorEl, 'setAttribute');
		const clickSpy = jest.spyOn(anchorEl, 'click');
		const removeSpy = jest.spyOn(anchorEl, 'remove');
		const createElSpy = jest
			.spyOn(document, 'createElement')
			.mockImplementation((tagName: any): any =>
				tagName === 'a' ? anchorEl : originalCreateElement(tagName),
			);
		const appendSpy = jest.spyOn(document.body, 'appendChild');

		const props = createTestProps();
		testRenderContent(props);

		fireEvent.click(screen.getByTestId(TEST_IDS.DOWNLOAD_BUTTON));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(appendSpy).toHaveBeenCalledWith(anchorEl);
			expect(setAttrSpy).toHaveBeenCalledWith('download', 'report.jsonl');
			expect(clickSpy).toHaveBeenCalled();
			expect(removeSpy).toHaveBeenCalled();
		});
		expect(anchorEl.getAttribute('download')).toBe('report.jsonl');

		createElSpy.mockRestore();
		appendSpy.mockRestore();
	});
});
