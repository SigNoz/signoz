import { fetchExportData } from 'api/v1/download/downloadExportData';
import { prepareQueryRangePayloadV5 } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	downloadFile,
	getTimestampedFileName,
} from 'lib/exportData/downloadFile';
import { stitchCsvParts, stitchJsonlParts } from 'lib/exportData/stitchParts';
import { ExportFormat } from 'lib/exportData/types';
import store from 'store';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import { EXPORT_CONCURRENCY, EXPORT_PAGE_SIZE } from './constants';

export interface ChunkedExportArgs {
	query: Query;
	timeRange: { start: number; end: number };
	// Total rows the query is expected to return; drives the page count.
	totalRows: number;
	fileNameBase: string;
}

interface RunChunkedExportProps extends ChunkedExportArgs {
	format: ExportFormat;
	signal: AbortSignal;
	// 0–100 whole number: parts completed over total parts.
	onProgress: (progress: number) => void;
}

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
	[ExportFormat.Csv]: 'text/csv',
	[ExportFormat.Jsonl]: 'application/x-ndjson',
};

/**
 * Chunked server export: fetches export_raw_data pages through a bounded
 * worker pool (EXPORT_CONCURRENCY wide — pages are independent since offsets
 * are precomputable), stitches the parts in page order client-side, and saves
 * a single file.
 */
export async function runChunkedExport({
	query,
	timeRange,
	totalRows,
	fileNameBase,
	format,
	signal,
	onProgress,
}: RunChunkedExportProps): Promise<void> {
	const totalParts = Math.max(1, Math.ceil(totalRows / EXPORT_PAGE_SIZE));
	const workerCount = Math.min(Math.max(1, EXPORT_CONCURRENCY), totalParts);

	// Internal controller so the first failed page (or a user cancel) stops the
	// whole fleet instead of letting siblings run to completion for nothing.
	const fleet = new AbortController();
	const onExternalAbort = (): void => fleet.abort();
	signal.addEventListener('abort', onExternalAbort);
	if (signal.aborted) {
		fleet.abort();
	}

	const buildPagePayload = (page: number): QueryRangePayloadV5 => {
		const pageQuery: Query = {
			...query,
			builder: {
				...query.builder,
				queryData: query.builder.queryData.map((qd) => ({
					...qd,
					limit: EXPORT_PAGE_SIZE,
					pageSize: EXPORT_PAGE_SIZE,
					offset: page * EXPORT_PAGE_SIZE,
				})),
			},
		};

		return prepareQueryRangePayloadV5({
			query: pageQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: 'GLOBAL_TIME',
			// Read directly (not via hooks) — the absolute bounds below take
			// precedence over the global picker in the payload anyway.
			globalSelectedInterval: store.getState().globalTime.selectedTime,
			start: timeRange.start,
			end: timeRange.end,
		}).queryPayload;
	};

	// Indexed by page so out-of-order completion can't scramble the stitch order.
	const parts = new Array<Blob | undefined>(totalParts);
	let nextPage = 0;
	let completedParts = 0;
	let serverRanDry = false;

	const worker = async (): Promise<void> => {
		while (!serverRanDry) {
			const page = nextPage;
			nextPage += 1;
			if (page >= totalParts) {
				return;
			}

			// eslint-disable-next-line no-await-in-loop
			const part = await fetchExportData({
				format,
				body: buildPagePayload(page),
				signal: fleet.signal,
			});

			// Empty part = the row count drifted and the server ran dry early;
			// stop claiming further pages (later in-flight pages are empty too).
			if (part.size === 0) {
				serverRanDry = true;
				return;
			}

			parts[page] = part;
			completedParts += 1;
			onProgress(Math.round((completedParts / totalParts) * 100));
		}
	};

	try {
		await Promise.all(Array.from({ length: workerCount }, () => worker()));
	} catch (error) {
		fleet.abort();
		throw error;
	} finally {
		signal.removeEventListener('abort', onExternalAbort);
	}

	const orderedParts = parts.filter((part): part is Blob => Boolean(part));
	const stitched =
		format === ExportFormat.Csv
			? await stitchCsvParts(orderedParts)
			: await stitchJsonlParts(orderedParts);

	downloadFile(
		stitched,
		getTimestampedFileName(fileNameBase, format),
		MIME_BY_FORMAT[format],
	);
}
