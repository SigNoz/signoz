import { act, renderHook } from '@testing-library/react';
import {
	downloadFile,
	getTimestampedFileName,
} from 'lib/exportData/downloadFile';
import { ExportFormat } from 'lib/exportData/types';
import { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { useClientExport } from '../useClientExport';

jest.mock('lib/exportData/downloadFile', () => ({
	...jest.requireActual('lib/exportData/downloadFile'),
	downloadFile: jest.fn(),
}));

const mockMessageError = jest.fn();
jest.mock('antd', () => {
	const actual = jest.requireActual('antd');
	return {
		...actual,
		message: { error: (...args: unknown[]): void => mockMessageError(...args) },
	};
});

const mockDownloadFile = downloadFile as jest.Mock;

const query = {
	queryType: 'builder',
	builder: {
		queryData: [
			{
				queryName: 'A',
				dataSource: 'logs',
				aggregations: [{ expression: 'count()' }],
				groupBy: [],
				legend: '',
			},
		],
		queryFormulas: [],
	},
} as unknown as Query;

function timeSeriesData(): MetricQueryRangeSuccessResponse {
	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: { data: { result: [], resultType: 'time_series' } },
		legendMap: { A: '{{service}}' },
		rawV5Response: {
			type: 'time_series',
			data: {
				results: [
					{
						queryName: 'A',
						aggregations: [
							{
								index: 0,
								alias: '',
								meta: {},
								series: [
									{
										labels: [{ key: { name: 'service' }, value: 'a' }],
										values: [{ timestamp: 1000, value: 12 }],
									},
								],
							},
						],
					},
				],
			},
			meta: {},
		},
	} as unknown as MetricQueryRangeSuccessResponse;
}

function scalarData(): MetricQueryRangeSuccessResponse {
	return {
		statusCode: 200,
		error: null,
		message: '',
		payload: {
			data: {
				resultType: 'scalar',
				result: [
					{
						queryName: 'A',
						legend: '',
						series: null,
						list: null,
						table: {
							columns: [
								{
									name: 'service.name',
									id: 'service.name',
									queryName: 'A',
									isValueColumn: false,
								},
								{ name: 'count()', id: 'A', queryName: 'A', isValueColumn: true },
							],
							rows: [{ data: { 'service.name': 'frontend', A: 120 } }],
						},
					},
				],
			},
		},
	} as unknown as MetricQueryRangeSuccessResponse;
}

describe('useClientExport', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Freeze the clock so filenames are deterministic — asserted against the
		// real getTimestampedFileName (the format itself is pinned by an exact
		// string in downloadFile.test).
		jest.useFakeTimers().setSystemTime(new Date(2026, 6, 13, 14, 32, 5));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('dispatches timeseries data to the timeseries serializer (csv)', () => {
		const { result } = renderHook(() =>
			useClientExport({ data: timeSeriesData(), query, fileName: 'chart' }),
		);

		act(() => {
			result.current.handleExport({ format: ExportFormat.Csv });
		});

		expect(mockDownloadFile).toHaveBeenCalledTimes(1);
		const [content, name, mime] = mockDownloadFile.mock.calls[0];
		// delegation: the hook names files via getTimestampedFileName
		expect(name).toBe(getTimestampedFileName('chart', 'csv'));
		expect(mime).toContain('text/csv');
		expect(content).toContain('service');
	});

	it('dispatches scalar (table) data to the table serializer', () => {
		const { result } = renderHook(() =>
			useClientExport({ data: scalarData(), query, fileName: 'table' }),
		);

		act(() => {
			result.current.handleExport({ format: ExportFormat.Csv });
		});

		expect(mockDownloadFile).toHaveBeenCalledTimes(1);
		const [content, name] = mockDownloadFile.mock.calls[0];
		expect(name).toBe(getTimestampedFileName('table', 'csv'));
		expect(content).toContain('service.name');
		expect(content).toContain('frontend');
		expect(content).toContain('120');
	});

	it('exports as JSONL with the ndjson mime', () => {
		const { result } = renderHook(() =>
			useClientExport({ data: timeSeriesData(), query }),
		);

		act(() => {
			result.current.handleExport({ format: ExportFormat.Jsonl });
		});

		const [content, name, mime] = mockDownloadFile.mock.calls[0];
		expect(name).toBe(getTimestampedFileName('export', 'jsonl'));
		expect(mime).toContain('ndjson');
		expect(content).toContain('"series"');
	});

	it('does nothing when there is no data', () => {
		const { result } = renderHook(() => useClientExport({ query }));

		act(() => {
			result.current.handleExport({ format: ExportFormat.Csv });
		});

		expect(mockDownloadFile).not.toHaveBeenCalled();
		expect(mockMessageError).not.toHaveBeenCalled();
	});

	it('shows an error for unsupported result types', () => {
		const raw = {
			statusCode: 200,
			error: null,
			message: '',
			payload: { data: { result: [], resultType: '' } },
		} as unknown as MetricQueryRangeSuccessResponse;
		const { result } = renderHook(() => useClientExport({ data: raw, query }));

		act(() => {
			result.current.handleExport({ format: ExportFormat.Csv });
		});

		expect(mockDownloadFile).not.toHaveBeenCalled();
		expect(mockMessageError).toHaveBeenCalled();
	});
});
