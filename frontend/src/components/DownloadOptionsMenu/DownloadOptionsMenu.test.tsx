// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import configureStore from 'redux-mock-store';
import store from 'store';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import '@testing-library/jest-dom';

import { DownloadFormats, DownloadRowCounts } from './constants';
import DownloadOptionsMenu from './DownloadOptionsMenu';

const mockDownloadExportData = jest.fn().mockResolvedValue(undefined);
jest.mock('api/v1/download/downloadExportData', () => ({
	downloadExportData: (...args: any[]): any => mockDownloadExportData(...args),
	default: (...args: any[]): any => mockDownloadExportData(...args),
}));

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

const mockUseQueryBuilder = jest.fn();
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): any => mockUseQueryBuilder(),
}));

const mockStore = configureStore([]);
const createMockReduxStore = (): any =>
	mockStore({
		...store.getState(),
	});

const createMockStagedQuery = (dataSource: DataSource): Query => ({
	id: 'test-query-id',
	queryType: EQueryType.QUERY_BUILDER,
	builder: {
		queryData: [
			{
				queryName: 'A',
				dataSource,
				aggregateOperator: StringOperators.NOOP,
				aggregateAttribute: {
					id: '',
					dataType: '' as any,
					key: '',
					type: '',
				},
				aggregations: [{ expression: 'count()' }],
				functions: [],
				filter: { expression: 'status = 200' },
				filters: { items: [], op: 'AND' },
				groupBy: [],
				expression: 'A',
				disabled: false,
				having: { expression: '' } as any,
				limit: null,
				stepInterval: null,
				orderBy: [{ columnName: 'timestamp', order: 'desc' }],
				legend: '',
				selectColumns: [],
			},
		],
		queryFormulas: [],
		queryTraceOperator: [],
	},
	promql: [],
	clickhouse_sql: [],
});

const renderWithStore = (dataSource: DataSource): void => {
	const mockReduxStore = createMockReduxStore();
	render(
		<Provider store={mockReduxStore}>
			<DownloadOptionsMenu dataSource={dataSource} />
		</Provider>,
	);
};

describe.each([
	[DataSource.LOGS, 'logs'],
	[DataSource.TRACES, 'traces'],
])('DownloadOptionsMenu for %s', (dataSource, signal) => {
	const testId = `periscope-btn-download-${dataSource}`;

	beforeEach(() => {
		mockDownloadExportData.mockReset().mockResolvedValue(undefined);
		(message.success as jest.Mock).mockReset();
		(message.error as jest.Mock).mockReset();
		mockUseQueryBuilder.mockReturnValue({
			stagedQuery: createMockStagedQuery(dataSource),
		});
	});

	it('renders download button', () => {
		renderWithStore(dataSource);
		const button = screen.getByTestId(testId);
		expect(button).toBeInTheDocument();
		expect(button).toHaveClass('periscope-btn', 'ghost');
	});

	it('shows popover with export options when download button is clicked', () => {
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));

		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(screen.getByText('FORMAT')).toBeInTheDocument();
		expect(screen.getByText('Number of Rows')).toBeInTheDocument();
		expect(screen.getByText('Columns')).toBeInTheDocument();
	});

	it('allows changing export format', () => {
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));

		const csvRadio = screen.getByRole('radio', { name: 'csv' });
		const jsonlRadio = screen.getByRole('radio', { name: 'jsonl' });

		expect(csvRadio).toBeChecked();
		fireEvent.click(jsonlRadio);
		expect(jsonlRadio).toBeChecked();
		expect(csvRadio).not.toBeChecked();
	});

	it('allows changing row limit', () => {
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));

		const tenKRadio = screen.getByRole('radio', { name: '10k' });
		const fiftyKRadio = screen.getByRole('radio', { name: '50k' });

		expect(tenKRadio).toBeChecked();
		fireEvent.click(fiftyKRadio);
		expect(fiftyKRadio).toBeChecked();
		expect(tenKRadio).not.toBeChecked();
	});

	it('allows changing columns scope', () => {
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));

		const allColumnsRadio = screen.getByRole('radio', { name: 'All' });
		const selectedColumnsRadio = screen.getByRole('radio', { name: 'Selected' });

		expect(allColumnsRadio).toBeChecked();
		fireEvent.click(selectedColumnsRadio);
		expect(selectedColumnsRadio).toBeChecked();
		expect(allColumnsRadio).not.toBeChecked();
	});

	it('calls downloadExportData with correct format and POST body', async () => {
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(mockDownloadExportData).toHaveBeenCalledTimes(1);
			const callArgs = mockDownloadExportData.mock.calls[0][0];
			expect(callArgs.format).toBe(DownloadFormats.CSV);
			expect(callArgs.body).toBeDefined();
			expect(callArgs.body.requestType).toBe('raw');
			expect(callArgs.body.compositeQuery.queries).toHaveLength(1);

			const query = callArgs.body.compositeQuery.queries[0];
			expect(query.type).toBe('builder_query');
			expect(query.spec.signal).toBe(signal);
			expect(query.spec.limit).toBe(DownloadRowCounts.TEN_K);
		});
	});

	it('clears groupBy and having in the export payload', async () => {
		const mockQuery = createMockStagedQuery(dataSource);
		mockQuery.builder.queryData[0].groupBy = [
			{ key: 'service', dataType: 'string' as any, type: '' },
		];
		mockQuery.builder.queryData[0].having = {
			expression: 'count() > 10',
		} as any;

		mockUseQueryBuilder.mockReturnValue({ stagedQuery: mockQuery });
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(mockDownloadExportData).toHaveBeenCalledTimes(1);
			const callArgs = mockDownloadExportData.mock.calls[0][0];
			const query = callArgs.body.compositeQuery.queries[0];
			expect(query.spec.groupBy).toBeUndefined();
			expect(query.spec.having).toEqual({ expression: '' });
		});
	});

	it('keeps selectColumns when column scope is Selected', async () => {
		const mockQuery = createMockStagedQuery(dataSource);
		mockQuery.builder.queryData[0].selectColumns = [
			{ name: 'http.status', fieldDataType: 'int64', fieldContext: 'attribute' },
		] as any;

		mockUseQueryBuilder.mockReturnValue({ stagedQuery: mockQuery });
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));
		fireEvent.click(screen.getByRole('radio', { name: 'Selected' }));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(mockDownloadExportData).toHaveBeenCalledTimes(1);
			const callArgs = mockDownloadExportData.mock.calls[0][0];
			const query = callArgs.body.compositeQuery.queries[0];
			expect(query.spec.selectFields).toEqual([
				expect.objectContaining({
					name: 'http.status',
					fieldDataType: 'int64',
				}),
			]);
		});
	});

	it('sends no selectFields when column scope is All', async () => {
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));
		fireEvent.click(screen.getByRole('radio', { name: 'All' }));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(mockDownloadExportData).toHaveBeenCalledTimes(1);
			const callArgs = mockDownloadExportData.mock.calls[0][0];
			const query = callArgs.body.compositeQuery.queries[0];
			expect(query.spec.selectFields).toBeUndefined();
		});
	});

	it('handles successful export with success message', async () => {
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(message.success).toHaveBeenCalledWith(
				'Export completed successfully',
			);
		});
	});

	it('handles export failure with error message', async () => {
		mockDownloadExportData.mockRejectedValueOnce(new Error('Server error'));
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(message.error).toHaveBeenCalledWith(
				`Failed to export ${dataSource}. Please try again.`,
			);
		});
	});

	it('handles UI state correctly during export process', async () => {
		let resolveDownload: () => void;
		mockDownloadExportData.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					resolveDownload = resolve;
				}),
		);
		renderWithStore(dataSource);

		fireEvent.click(screen.getByTestId(testId));
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Export'));

		expect(screen.getByTestId(testId)).toBeDisabled();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		resolveDownload!();

		await waitFor(() => {
			expect(screen.getByTestId(testId)).not.toBeDisabled();
		});
	});
});

describe('DownloadOptionsMenu for traces with queryTraceOperator', () => {
	const dataSource = DataSource.TRACES;
	const testId = `periscope-btn-download-${dataSource}`;

	beforeEach(() => {
		mockDownloadExportData.mockReset().mockResolvedValue(undefined);
		(message.success as jest.Mock).mockReset();
	});

	it('applies limit and clears groupBy on queryTraceOperator entries', async () => {
		const query = createMockStagedQuery(dataSource);
		query.builder.queryTraceOperator = [
			{
				...query.builder.queryData[0],
				queryName: 'TraceOp1',
				expression: 'TraceOp1',
				groupBy: [{ key: 'service', dataType: 'string' as any, type: '' }],
			},
		];

		mockUseQueryBuilder.mockReturnValue({ stagedQuery: query });
		renderWithStore(dataSource);
		fireEvent.click(screen.getByTestId(testId));
		fireEvent.click(screen.getByRole('radio', { name: '50k' }));
		fireEvent.click(screen.getByText('Export'));

		await waitFor(() => {
			expect(mockDownloadExportData).toHaveBeenCalledTimes(1);
			const callArgs = mockDownloadExportData.mock.calls[0][0];
			const queries = callArgs.body.compositeQuery.queries;
			const traceOpQuery = queries.find((q: any) => q.spec.name === 'TraceOp1');
			if (traceOpQuery) {
				expect(traceOpQuery.spec.limit).toBe(DownloadRowCounts.FIFTY_K);
				expect(traceOpQuery.spec.groupBy).toBeUndefined();
			}
		});
	});
});
