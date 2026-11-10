import 'tests/blob-polyfill';

import { fetchExportData } from 'api/v1/download/downloadExportData';
import { prepareQueryRangePayloadV5 } from 'api/v5/v5';
import { downloadFile } from 'lib/exportData/downloadFile';
import { ExportFormat } from 'lib/exportData/types';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { runChunkedExport } from '../runChunkedExport';

jest.mock('api/v1/download/downloadExportData', () => ({
	fetchExportData: jest.fn(),
}));

jest.mock('api/v5/v5', () => ({
	prepareQueryRangePayloadV5: jest.fn(),
}));

jest.mock('lib/exportData/downloadFile', () => ({
	downloadFile: jest.fn(),
	getTimestampedFileName: jest.fn(
		(base: string, ext: string) => `${base}.${ext}`,
	),
}));

const mockFetch = fetchExportData as jest.Mock;
const mockPreparePayload = prepareQueryRangePayloadV5 as jest.Mock;
const mockDownloadFile = downloadFile as jest.Mock;

// Minimal query shape — the runner only maps over builder.queryData.
const query = {
	builder: { queryData: [{}] },
} as unknown as Query;

const baseArgs = {
	query,
	timeRange: { start: 100, end: 200 },
	fileNameBase: 'trace-x',
	format: ExportFormat.Csv,
	onProgress: jest.fn(),
};

// EXPORT_PAGE_SIZE is 50_000; rows → parts: 120k → 3, 40k → 1, etc.
const rowsForParts = (parts: number): number => parts * 50_000;

function runArgs(
	overrides: Partial<Parameters<typeof runChunkedExport>[0]> = {},
): Parameters<typeof runChunkedExport>[0] {
	return {
		...baseArgs,
		totalRows: rowsForParts(1),
		signal: new AbortController().signal,
		onProgress: jest.fn(),
		...overrides,
	};
}

async function savedFileText(): Promise<string> {
	expect(mockDownloadFile).toHaveBeenCalledTimes(1);
	const [blob] = mockDownloadFile.mock.calls[0];
	return (blob as Blob).text();
}

describe('runChunkedExport', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockPreparePayload.mockImplementation(({ query: pageQuery }) => ({
			// Echo the page offset so fetch calls can be asserted per page.
			queryPayload: { offset: pageQuery.builder.queryData[0].offset },
		}));
	});

	it('fetches one page for small exports and saves the file', async () => {
		mockFetch.mockResolvedValueOnce(new Blob(['h\na,b\n']));
		const onProgress = jest.fn();

		await runChunkedExport(runArgs({ totalRows: 40_000, onProgress }));

		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch.mock.calls[0][0].body).toStrictEqual({ offset: 0 });
		expect(onProgress).toHaveBeenCalledWith(100);
		await expect(savedFileText()).resolves.toBe('h\na,b\n');
	});

	it('fetches every page with the right offsets and stitches in order', async () => {
		mockFetch.mockImplementation(({ body }) =>
			Promise.resolve(new Blob([`h\nrow-${body.offset}\n`])),
		);

		await runChunkedExport(runArgs({ totalRows: rowsForParts(3) }));

		const offsets = mockFetch.mock.calls.map(([props]) => props.body.offset);
		expect(offsets.sort((a, b) => a - b)).toStrictEqual([0, 50_000, 100_000]);
		await expect(savedFileText()).resolves.toBe(
			'h\nrow-0\nrow-50000\nrow-100000\n',
		);
	});

	it('keeps page order even when later pages resolve first', async () => {
		const resolvers: Record<number, (b: Blob) => void> = {};
		mockFetch.mockImplementation(
			({ body }) =>
				new Promise((resolve) => {
					resolvers[body.offset] = resolve;
				}),
		);

		const promise = runChunkedExport(runArgs({ totalRows: rowsForParts(3) }));
		// All 3 pages are in flight (concurrency 3); resolve in reverse order.
		await Promise.resolve();
		resolvers[100_000](new Blob(['h\nc\n']));
		resolvers[50_000](new Blob(['h\nb\n']));
		resolvers[0](new Blob(['h\na\n']));
		await promise;

		await expect(savedFileText()).resolves.toBe('h\na\nb\nc\n');
	});

	it('stops claiming pages once the server runs dry', async () => {
		// Count says 5 pages but the server only has data for page 0.
		mockFetch.mockImplementation(({ body }) =>
			Promise.resolve(body.offset === 0 ? new Blob(['h\na\n']) : new Blob([])),
		);

		await runChunkedExport(runArgs({ totalRows: rowsForParts(5) }));

		// Workers stop claiming once an empty part is observed — exact count is
		// timing-dependent, but it must never fetch all 5 pages.
		expect(mockFetch.mock.calls.length).toBeLessThan(5);
		await expect(savedFileText()).resolves.toBe('h\na\n');
	});

	it('rejects on page failure, aborts in-flight siblings, saves nothing', async () => {
		const seenSignals: AbortSignal[] = [];
		mockFetch.mockImplementation(({ body, signal }) => {
			seenSignals.push(signal);
			return body.offset === 50_000
				? Promise.reject(new Error('boom'))
				: new Promise(() => {}); // siblings hang until aborted
		});

		await expect(
			runChunkedExport(runArgs({ totalRows: rowsForParts(3) })),
		).rejects.toThrow('boom');

		expect(seenSignals.every((s) => s.aborted)).toBe(true);
		expect(mockDownloadFile).not.toHaveBeenCalled();
	});

	it('propagates a user abort to the page fetches', async () => {
		const controller = new AbortController();
		mockFetch.mockImplementation(
			({ signal }) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () =>
						reject(new DOMException('Aborted', 'AbortError')),
					);
				}),
		);

		const promise = runChunkedExport(
			runArgs({ totalRows: rowsForParts(2), signal: controller.signal }),
		);
		await Promise.resolve();
		controller.abort();

		await expect(promise).rejects.toThrow('Aborted');
		expect(mockDownloadFile).not.toHaveBeenCalled();
	});

	it('reports whole-number progress per completed part', async () => {
		mockFetch.mockImplementation(({ body }) =>
			Promise.resolve(new Blob([`h\nrow-${body.offset}\n`])),
		);
		const onProgress = jest.fn();

		await runChunkedExport(runArgs({ totalRows: rowsForParts(3), onProgress }));

		const reported = onProgress.mock.calls.map(([p]) => p);
		expect(reported).toHaveLength(3);
		expect(reported).toStrictEqual(expect.arrayContaining([33, 67, 100]));
	});
});
