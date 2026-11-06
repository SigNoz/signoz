import { initialQueriesMap } from 'constants/queryBuilder';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import {
	listResponse,
	listRows,
	QUERY_RANGE_URL,
	renderListView,
} from './testUtils';

// globalTime starts with loading:true, which gates the list query. Force just that
// slice's loading to false so the query fires; every other selector is untouched.
jest.mock('react-redux', () => {
	const actual = jest.requireActual('react-redux');
	return {
		...actual,
		useSelector: (selector: (state: unknown) => unknown): unknown => {
			const result = actual.useSelector(selector);
			if (result && typeof result === 'object' && 'loading' in result) {
				return { ...result, loading: false };
			}
			return result;
		},
	};
});

// List columns come from the options menu (server-synced preferences). Pin them
// so the expected columns render, independent of that API.
jest.mock('container/OptionsMenu/useOptionsMenu', () => ({
	__esModule: true,
	default: (): unknown => ({
		options: {
			selectColumns: [
				{ name: 'service.name', fieldContext: 'resource' },
				{ name: 'name', fieldContext: 'span' },
				{ name: 'duration_nano', fieldContext: 'span' },
				{ name: 'http_method', fieldContext: 'span' },
				{ name: 'response_status_code', fieldContext: 'span' },
				{ name: 'http.route', fieldContext: 'attribute' },
				{ name: 'cache.hit', fieldContext: 'attribute' },
			],
		},
		config: { addColumn: { onRemove: jest.fn() } },
	}),
}));

type ListRequest = {
	offset: number;
	limit: number;
	start: number;
	end: number;
};

// Answers each offset with `rowsPerOffset[offset]` rows and records every request.
const mockListPages = (
	rowsPerOffset: Record<number, number>,
	firstPageDelayMs = 0,
): ListRequest[] => {
	const requests: ListRequest[] = [];
	server.use(
		rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
			const body = await req.json<QueryRangeRequestV5>();
			const spec = body.compositeQuery.queries[0].spec as {
				offset?: number;
				limit: number;
			};
			const offset = spec.offset ?? 0;
			requests.push({
				offset,
				limit: spec.limit,
				start: body.start,
				end: body.end,
			});
			const length = Math.min(rowsPerOffset[offset] ?? 0, spec.limit);
			const rows = Array.from({ length }, (_, i) => ({
				...listRows[0],
				data: {
					...listRows[0].data,
					name: `span-${offset + i}`,
					span_id: `span-${offset + i}`,
				},
			}));
			return res(
				ctx.delay(offset === 0 ? firstPageDelayMs : 0),
				ctx.status(200),
				ctx.json(listResponse(rows)),
			);
		}),
	);
	return requests;
};

// Tall enough that the mocked virtuoso renders every row and reaches the end.
const FULL_HEIGHT = 200 * 54;

describe('Traces ListView - infinite scroll', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('loads the next page at the end of the list over the same window', async () => {
		// Past the one-second resolution of the window, so a recomputed "now" would show.
		const requests = mockListPages({ 0: 100, 100: 5 }, 1100);
		renderListView(initialQueriesMap.traces, FULL_HEIGHT);

		await expect(
			screen.findByText('span-104', undefined, { timeout: 3000 }),
		).resolves.toBeInTheDocument();
		expect(screen.getByText('span-0')).toBeInTheDocument();
		expect(requests.map(({ offset }) => offset)).toStrictEqual([0, 100]);
		expect(requests[1].start).toBe(requests[0].start);
		expect(requests[1].end).toBe(requests[0].end);
	});

	it('stops after a short page', async () => {
		const requests = mockListPages({ 0: 5 });
		renderListView(initialQueriesMap.traces, FULL_HEIGHT);

		await expect(screen.findByText('span-4')).resolves.toBeInTheDocument();
		expect(requests.map(({ offset }) => offset)).toStrictEqual([0]);
	});

	it('stops at the query limit', async () => {
		const requests = mockListPages({ 0: 100, 100: 100 });
		const { builder } = initialQueriesMap.traces;
		renderListView(
			{
				...initialQueriesMap.traces,
				builder: {
					...builder,
					queryData: [{ ...builder.queryData[0], limit: 150 }],
				},
			} as Query,
			FULL_HEIGHT,
		);

		await expect(screen.findByText('span-149')).resolves.toBeInTheDocument();
		expect(
			requests.map(({ offset, limit }) => ({ offset, limit })),
		).toStrictEqual([
			{ offset: 0, limit: 100 },
			{ offset: 100, limit: 50 },
		]);
	});
});
