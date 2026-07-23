import 'tests/blob-polyfill';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fetchExportData } from 'api/v1/download/downloadExportData';
import { downloadFile } from 'lib/exportData/downloadFile';
import { render } from 'tests/test-utils';

import TraceDownloadPanel from '../TraceDownloadPanel';
import TraceOptionsMenu from '../TraceOptionsMenu';
import { MAX_EXPORT_SPANS } from '../useDownloadTrace';

// Integration suite: menu → hook → store → runner → stitchers → panel all run
// for real; only the true boundaries are mocked (HTTP + file save).
jest.mock('api/v1/download/downloadExportData', () => ({
	fetchExportData: jest.fn(),
}));

jest.mock('lib/exportData/downloadFile', () => ({
	downloadFile: jest.fn(),
	getTimestampedFileName: jest.fn(
		(base: string, ext: string) => `${base}.${ext}`,
	),
}));

const mockFetch = fetchExportData as jest.Mock;
const mockDownloadFile = downloadFile as jest.Mock;

const baseProps = {
	showTraceDetails: true,
	onToggleTraceDetails: jest.fn(),
	onOpenPreviewFields: jest.fn(),
	traceId: 'trace-123',
	startTime: 1_000,
	endTime: 2_000,
	// 120k spans → 3 export pages of 50k.
	totalSpansCount: 120_000,
};

function renderFeature(
	props: Partial<typeof baseProps> = {},
): ReturnType<typeof render> {
	return render(
		<>
			<TraceOptionsMenu {...baseProps} {...props} />
			<TraceDownloadPanel />
		</>,
	);
}

// skipHover: simulated pointer travel fires pointerleave on the subtrigger and
// radix's grace-area math (zero rects in jsdom) closes the submenu.
// pointerEventsCheck 0: radix puts pointer-events:none on <body> while open.
function setupUser(): ReturnType<typeof userEvent.setup> {
	return userEvent.setup({
		delay: null,
		skipHover: true,
		pointerEventsCheck: 0,
	});
}

async function startDownload(
	format: 'csv' | 'jsonl' = 'csv',
): Promise<ReturnType<typeof userEvent.setup>> {
	const user = setupUser();
	await user.click(screen.getByRole('button', { name: /trace options/i }));
	await user.click(await screen.findByTestId('download-trace-submenu'));
	await user.click(await screen.findByTestId(`download-trace-${format}`));
	return user;
}

async function savedFileText(): Promise<string> {
	expect(mockDownloadFile).toHaveBeenCalledTimes(1);
	const [blob] = mockDownloadFile.mock.calls[0];
	return (blob as Blob).text();
}

describe('trace download flow', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('downloads a multi-page trace as one stitched CSV', async () => {
		mockFetch.mockImplementation(({ body }) =>
			Promise.resolve(
				new Blob([`h1,h2\nrow-${body.compositeQuery.queries[0].spec.offset}\n`]),
			),
		);

		renderFeature();
		await startDownload('csv');

		await waitFor(() => expect(mockDownloadFile).toHaveBeenCalled());

		// Real query building: trace scoping, page offsets, ±5min window (seconds→ms).
		const bodies = mockFetch.mock.calls.map(([props]) => props.body);
		const specs = bodies.map((b) => b.compositeQuery.queries[0].spec);
		expect(specs[0].filter.expression).toBe("trace_id = 'trace-123'");
		expect(specs.map((s) => s.offset).sort((a, b) => a - b)).toStrictEqual([
			0, 50_000, 100_000,
		]);
		expect(bodies[0].start).toBe((baseProps.startTime - 300) * 1e3);
		expect(bodies[0].end).toBe((baseProps.endTime + 300) * 1e3);

		// Stitched in page order, headers deduped, saved under the trace's name.
		await expect(savedFileText()).resolves.toBe(
			'h1,h2\nrow-0\nrow-50000\nrow-100000\n',
		);
		expect(mockDownloadFile.mock.calls[0][1]).toBe('trace-trace-123.csv');

		// Panel dismissed once the download completed.
		await waitFor(() =>
			expect(screen.queryByTestId('trace-download-panel')).not.toBeInTheDocument(),
		);
	});

	it('downloads JSONL when that format is chosen', async () => {
		mockFetch.mockResolvedValue(new Blob(['{"a":1}\n']));

		renderFeature({ totalSpansCount: 10 });
		await startDownload('jsonl');

		await waitFor(() => expect(mockDownloadFile).toHaveBeenCalled());
		expect(mockFetch.mock.calls[0][0].format).toBe('jsonl');
		expect(mockDownloadFile.mock.calls[0][1]).toBe('trace-trace-123.jsonl');
	});

	it('shows the progress panel while downloading and cancels from its ✕', async () => {
		// Fetches hang until aborted — the download stays in flight.
		mockFetch.mockImplementation(
			({ signal }) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () =>
						reject(new DOMException('Aborted', 'AbortError')),
					);
				}),
		);

		renderFeature();
		const user = await startDownload();

		// Panel appears with the 1% floor (no part finished yet).
		const panel = await screen.findByTestId('trace-download-panel');
		expect(panel).toBeInTheDocument();
		expect(screen.getByTestId('trace-download-percent')).toHaveTextContent('1%');

		await user.click(screen.getByTestId('trace-download-cancel'));

		await waitFor(() =>
			expect(screen.queryByTestId('trace-download-panel')).not.toBeInTheDocument(),
		);
		expect(mockDownloadFile).not.toHaveBeenCalled();
	});

	it('disables the submenu trigger while a download is running', async () => {
		mockFetch.mockImplementation(
			({ signal }) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener('abort', () =>
						reject(new DOMException('Aborted', 'AbortError')),
					);
				}),
		);

		renderFeature();
		const user = await startDownload();

		// Reopen the menu mid-download: trigger is disabled by REAL store state.
		await user.click(screen.getByRole('button', { name: /trace options/i }));
		const trigger = await screen.findByTestId('download-trace-submenu');
		expect(trigger).toHaveAttribute('data-disabled');

		// Cleanup: stop the in-flight download so the module-scoped guard resets.
		await user.click(screen.getByTestId('trace-download-cancel'));
		await waitFor(() =>
			expect(screen.queryByTestId('trace-download-panel')).not.toBeInTheDocument(),
		);
	});

	it('hides the download option entirely above the export cap', async () => {
		renderFeature({ totalSpansCount: MAX_EXPORT_SPANS + 1 });
		const user = setupUser();
		await user.click(screen.getByRole('button', { name: /trace options/i }));

		await expect(
			screen.findByRole('menuitem', { name: /preview fields/i }),
		).resolves.toBeInTheDocument();
		expect(
			screen.queryByTestId('download-trace-submenu'),
		).not.toBeInTheDocument();
	});

	it('saves nothing and dismisses the panel when a page fails', async () => {
		mockFetch.mockRejectedValue(new Error('boom'));

		renderFeature();
		await startDownload();

		await waitFor(() =>
			expect(screen.queryByTestId('trace-download-panel')).not.toBeInTheDocument(),
		);
		expect(mockDownloadFile).not.toHaveBeenCalled();
	});

	it('cancels the in-flight download when the panel unmounts (leaving the page)', async () => {
		const seenSignals: AbortSignal[] = [];
		mockFetch.mockImplementation(
			({ signal }) =>
				new Promise((_resolve, reject) => {
					seenSignals.push(signal);
					signal.addEventListener('abort', () =>
						reject(new DOMException('Aborted', 'AbortError')),
					);
				}),
		);

		const { unmount } = renderFeature();
		await startDownload();
		await screen.findByTestId('trace-download-panel');

		unmount();

		await waitFor(() =>
			expect(seenSignals.every((signal) => signal.aborted)).toBe(true),
		);
		expect(mockDownloadFile).not.toHaveBeenCalled();
	});
});
