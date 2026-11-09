import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, userEvent, waitFor } from 'tests/test-utils';
import { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import {
	groupedResponse,
	groupedRows,
	QUERY_RANGE_URL,
	renderTracesView,
} from './testUtils';

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

const PAGINATION_TEST_ID = 'traces-table-trace-pagination';
const NEXT_TEST_ID = `${PAGINATION_TEST_ID}-next`;

describe('TracesView pagination', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('offers the next page after a full page and requests its offset', async () => {
		const offsets = mockPages({ 0: 20, 20: 3 });
		const user = userEvent.setup();
		renderTracesView();

		const next = await screen.findByTestId(NEXT_TEST_ID);
		await waitFor(() => expect(next).toBeEnabled());
		await user.click(next);

		await expect(screen.findByText('trace-22')).resolves.toBeInTheDocument();
		expect(offsets).toStrictEqual([0, 20]);
	});

	it('offers no page past the next one until that page arrives', async () => {
		let release = (): void => {};
		const pageTwo = new Promise<void>((resolve) => {
			release = resolve;
		});
		mockPages({ 0: 20, 20: 20 }, { 20: pageTwo });
		const user = userEvent.setup();
		renderTracesView();

		const next = await screen.findByTestId(NEXT_TEST_ID);
		await waitFor(() => expect(next).toBeEnabled());
		await user.click(next);

		expect(
			screen.queryByTestId(`${PAGINATION_TEST_ID}-page-3`),
		).not.toBeInTheDocument();

		release();
		await expect(
			screen.findByTestId(`${PAGINATION_TEST_ID}-page-3`),
		).resolves.toBeInTheDocument();
	});

	it('offers no next page after a short page', async () => {
		mockPages({ 0: 3 });
		renderTracesView();

		await screen.findAllByText('frontend');
		expect(screen.queryByTestId(NEXT_TEST_ID)).not.toBeInTheDocument();
	});
});
