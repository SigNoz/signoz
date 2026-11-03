import { ENVIRONMENT } from 'constants/env';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { VirtuosoMockContext } from 'react-virtuoso';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import TracesView from './index';

const BASE_URL = ENVIRONMENT.baseURL;
const QUERY_RANGE_URL = `${BASE_URL}/api/v5/query_range`;

const groupedRows = [
	{
		timestamp: '2024-07-19T08:39:58.735245Z',
		data: {
			'service.name': 'frontend',
			name: 'HTTP GET',
			duration_nano: 55306000,
			span_count: 8,
			trace_id: '0000000000000000344ded1387b08a7e',
		},
	},
	{
		timestamp: '2024-07-19T08:39:59.949129915Z',
		data: {
			'service.name': 'demo-app',
			// intentionally empty to assert the "-" cell
			name: '',
			duration_nano: 790949390,
			span_count: 3,
			trace_id: 'a364a8e15af3e9a8c866e0528db8b637',
		},
	},
];

const groupedResponse = (rows: unknown[]): Record<string, unknown> => ({
	data: { type: 'trace', data: { results: [{ queryName: 'A', rows }] } },
});

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

// Answers each offset with `rowsPerOffset[offset]` rows and records the offsets asked for.
// An offset in `held` answers once its promise resolves.
const mockPages = (
	rowsPerOffset: Record<number, number>,
	held?: Record<number, Promise<void>>,
): number[] => {
	const offsets: number[] = [];
	server.use(
		rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
			const body = (await req.json()) as QueryRangeRequestV5;
			const spec = body.compositeQuery.queries[0].spec as { offset?: number };
			const offset = spec.offset ?? 0;
			offsets.push(offset);
			await held?.[offset];
			const rows = Array.from({ length: rowsPerOffset[offset] ?? 0 }, (_, i) => ({
				...groupedRows[0],
				data: { ...groupedRows[0].data, trace_id: `trace-${offset + i}` },
			}));
			return res(ctx.status(200), ctx.json(groupedResponse(rows)));
		}),
	);
	return offsets;
};

const renderTracesView = (
	props: Record<string, unknown> = {},
): ReturnType<typeof render> =>
	render(
		<VirtuosoMockContext.Provider value={{ viewportHeight: 500, itemHeight: 54 }}>
			<TracesView
				isFilterApplied={false}
				setWarning={jest.fn()}
				setIsLoadingQueries={jest.fn()}
				{...props}
			/>
		</VirtuosoMockContext.Provider>,
		{},
		{
			initialRoute: '/traces-explorer',
			queryBuilderOverrides: {
				panelType: PANEL_TYPES.TRACE,
				stagedQuery: initialQueriesMap.traces,
				currentQuery: initialQueriesMap.traces,
			} as any,
		},
	);

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

	describe('pagination', () => {
		it('offers the next page after a full page and requests its offset', async () => {
			const offsets = mockPages({ 0: 10, 10: 3 });
			const user = userEvent.setup();
			renderTracesView();

			const next = await screen.findByRole('button', { name: 'Go to next page' });
			await waitFor(() => expect(next).toBeEnabled());
			await user.click(next);

			await expect(screen.findByText('trace-12')).resolves.toBeInTheDocument();
			expect(offsets).toStrictEqual([0, 10]);
		});

		it('offers no page past the next one until that page arrives', async () => {
			let release = (): void => {};
			const pageTwo = new Promise<void>((resolve) => {
				release = resolve;
			});
			mockPages({ 0: 10, 10: 10 }, { 10: pageTwo });
			const user = userEvent.setup();
			renderTracesView();

			const next = await screen.findByRole('button', { name: 'Go to next page' });
			await waitFor(() => expect(next).toBeEnabled());
			await user.click(next);

			const pager = screen.getByLabelText('pagination');
			expect(within(pager).queryByText('3')).not.toBeInTheDocument();

			release();
			await expect(within(pager).findByText('3')).resolves.toBeInTheDocument();
		});

		it('offers no next page after a short page', async () => {
			mockPages({ 0: 3 });
			renderTracesView();

			await screen.findAllByText('frontend');
			expect(
				screen.queryByRole('button', { name: 'Go to next page' }),
			).not.toBeInTheDocument();
		});
	});
});
