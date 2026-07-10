import { act, renderHook } from '@testing-library/react';
import { downloadFile } from 'lib/exportData/downloadFile';
import { ExportFormat } from 'lib/exportData/types';
import { QueryRangeResponseV5 } from 'types/api/v5/queryRange';

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

function timeSeriesResponse(): QueryRangeResponseV5 {
	return {
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
	} as unknown as QueryRangeResponseV5;
}

describe('useClientExport', () => {
	beforeEach(() => jest.clearAllMocks());

	it('exports time_series as CSV to a timestamped <fileName>.csv', () => {
		const { result } = renderHook(() =>
			useClientExport({
				response: timeSeriesResponse(),
				fileName: 'chart',
				legendMap: { A: '{{service}}' },
			}),
		);

		act(() => {
			result.current.handleExport({ format: ExportFormat.Csv });
		});

		expect(mockDownloadFile).toHaveBeenCalledTimes(1);
		const [content, name, mime] = mockDownloadFile.mock.calls[0];
		expect(name).toMatch(/^chart-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
		expect(mime).toContain('text/csv');
		expect(content).toContain('service');
		expect(content).toContain('a');
	});

	it('exports as JSONL to a timestamped <fileName>.jsonl with the ndjson mime', () => {
		const { result } = renderHook(() =>
			useClientExport({ response: timeSeriesResponse() }),
		);

		act(() => {
			result.current.handleExport({ format: ExportFormat.Jsonl });
		});

		const [content, name, mime] = mockDownloadFile.mock.calls[0];
		expect(name).toMatch(/^export-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.jsonl$/);
		expect(mime).toContain('ndjson');
		expect(content).toContain('"series"');
	});

	it('does nothing when there is no response', () => {
		const { result } = renderHook(() => useClientExport({}));

		act(() => {
			result.current.handleExport({ format: ExportFormat.Csv });
		});

		expect(mockDownloadFile).not.toHaveBeenCalled();
		expect(mockMessageError).not.toHaveBeenCalled();
	});

	it('shows an error and does not download for unsupported result types', () => {
		const raw = {
			type: 'raw',
			data: { results: [] },
			meta: {},
		} as unknown as QueryRangeResponseV5;
		const { result } = renderHook(() => useClientExport({ response: raw }));

		act(() => {
			result.current.handleExport({ format: ExportFormat.Csv });
		});

		expect(mockDownloadFile).not.toHaveBeenCalled();
		expect(mockMessageError).toHaveBeenCalled();
	});
});
