import { useCallback, useMemo } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { ExportFormat } from 'lib/exportData/types';

import { TraceDetailEventKeys, TraceDetailEvents } from '../events';
import { useTraceDetailLogEvent } from '../hooks/useTraceDetailLogEvent';
import { useTraceDownloadStore } from './traceDownloadStore';
import { getTraceExportQuery } from './traceExportQuery';

// Export window pad past the trace bounds so edge spans are never clipped
// (mirrors SpanDetailsPanel).
const FIVE_MINUTES_IN_SECONDS = 5 * 60;

// Span-count cap: traces above it hide their download option entirely.
export const MAX_EXPORT_SPANS = 500_000;

interface UseDownloadTraceProps {
	traceId: string;
	// Trace start/end in seconds.
	startTime: number;
	endTime: number;
	totalSpansCount: number;
}

interface UseDownloadTraceReturn {
	isDownloading: boolean;
	isExportDisabled: boolean;
	downloadTrace: (format: ExportFormat) => void;
}

export function useDownloadTrace({
	traceId,
	startTime,
	endTime,
	totalSpansCount,
}: UseDownloadTraceProps): UseDownloadTraceReturn {
	const isDownloading = useTraceDownloadStore((s) => s.isDownloading);
	const startDownload = useTraceDownloadStore((s) => s.startDownload);

	const logTraceEvent = useTraceDetailLogEvent('v3', traceId);

	const query = useMemo(() => getTraceExportQuery(traceId), [traceId]);

	const timeRange = useMemo(
		() => ({
			start: startTime - FIVE_MINUTES_IN_SECONDS,
			end: endTime + FIVE_MINUTES_IN_SECONDS,
		}),
		[startTime, endTime],
	);

	const downloadTrace = useCallback(
		(format: ExportFormat): void => {
			logTraceEvent(TraceDetailEvents.DownloadTriggered, {
				[TraceDetailEventKeys.Format]: format,
				[TraceDetailEventKeys.TotalSpansCount]: totalSpansCount,
			});

			const run = async (): Promise<void> => {
				try {
					const outcome = await startDownload({
						query,
						timeRange,
						totalRows: totalSpansCount,
						fileNameBase: `trace-${traceId}`,
						format,
					});
					if (outcome === 'completed') {
						toast.success('Export completed successfully');
					} else if (outcome === 'cancelled') {
						logTraceEvent(TraceDetailEvents.DownloadCancelled, {
							[TraceDetailEventKeys.Format]: format,
							[TraceDetailEventKeys.TotalSpansCount]: totalSpansCount,
						});
						toast.info('Export cancelled');
					}
				} catch (error) {
					toast.error('Failed to download trace');
					console.error(error);
				}
			};
			void run();
		},
		[query, timeRange, totalSpansCount, traceId, startDownload, logTraceEvent],
	);

	return {
		isDownloading,
		isExportDisabled: totalSpansCount > MAX_EXPORT_SPANS,
		downloadTrace,
	};
}
