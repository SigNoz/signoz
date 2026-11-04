import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, waitFor } from 'tests/test-utils';

import {
	groupedResponse,
	groupedRows,
	QUERY_RANGE_URL,
	renderTracesView,
} from './__tests__/testUtils';

const mockSuccess = (rows: unknown[] = groupedRows): void => {
	server.use(
		rest.post(QUERY_RANGE_URL, (_req, res, ctx) =>
			res(ctx.status(200), ctx.json(groupedResponse(rows))),
		),
	);
};

const mockError = (): void => {
	server.use(
		rest.post(QUERY_RANGE_URL, (_req, res, ctx) =>
			res(ctx.status(500), ctx.json({ status: 'error', error: 'boom' })),
		),
	);
};

describe('TracesView (grouped root-span table)', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('renders backend rows in FieldCell format', async () => {
		mockSuccess();
		renderTracesView();

		// service.name + name render as plain text
		await expect(screen.findByText('frontend')).resolves.toBeInTheDocument();
		expect(screen.getByText('HTTP GET')).toBeInTheDocument();

		// duration_nano renders in milliseconds
		expect(screen.getAllByTestId('duration_nano')[0]).toHaveTextContent(/ms$/);

		// span_count renders as text
		expect(screen.getByText('8')).toBeInTheDocument();

		// empty field renders "-"
		expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);

		// trace_id renders as a link to the trace detail
		const traceLinks = screen.getAllByTestId('trace-id');
		expect(traceLinks[0]).toHaveAttribute(
			'href',
			expect.stringContaining('/trace/0000000000000000344ded1387b08a7e'),
		);
	});

	it('shows the empty state and keeps the toolbar when there are no rows', async () => {
		mockSuccess([]);
		renderTracesView();

		// toolbar (un-gated) stays visible regardless of data
		expect(
			screen.getByText(/This tab only shows Root Spans/i),
		).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText(/No traces yet/i)).toBeInTheDocument();
		});
	});

	it('keeps the toolbar visible on API error', async () => {
		mockError();
		renderTracesView();

		expect(
			screen.getByText(/This tab only shows Root Spans/i),
		).toBeInTheDocument();
	});
});
