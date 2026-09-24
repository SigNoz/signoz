import {
	ChunkedExportArgs,
	runChunkedExport,
} from 'hooks/useExportData/runChunkedExport';
import { ExportFormat } from 'lib/exportData/types';
import { create } from 'zustand';

/** 'skipped' = a download was already in flight; the call was ignored. */
export type TraceDownloadOutcome = 'completed' | 'cancelled' | 'skipped';

interface TraceDownloadState {
	isDownloading: boolean;
	// 0–100
	progress: number;
	startDownload: (
		args: ChunkedExportArgs & { format: ExportFormat },
	) => Promise<TraceDownloadOutcome>;
	cancelDownload: () => void;
}

let abortController: AbortController | null = null;

export const useTraceDownloadStore = create<TraceDownloadState>((set) => ({
	isDownloading: false,
	progress: 0,

	startDownload: async ({
		format,
		...args
	}: ChunkedExportArgs & {
		format: ExportFormat;
	}): Promise<TraceDownloadOutcome> => {
		if (abortController) {
			return 'skipped';
		}

		const controller = new AbortController();
		abortController = controller;
		set({ isDownloading: true, progress: 0 });

		try {
			await runChunkedExport({
				...args,
				format,
				signal: controller.signal,
				onProgress: (progress: number): void => set({ progress }),
			});
			return 'completed';
		} catch (error) {
			if (controller.signal.aborted) {
				return 'cancelled';
			}
			throw error;
		} finally {
			abortController = null;
			set({ isDownloading: false });
		}
	},

	cancelDownload: (): void => {
		abortController?.abort();
	},
}));
