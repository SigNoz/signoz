import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import Filters from '../Filters';

jest.mock('components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch', () => ({
	__esModule: true,
	default: ({
		onChange,
		onRun,
	}: {
		onChange: (value: string) => void;
		onRun: (value: string) => void;
	}): JSX.Element => (
		<input
			aria-label="filter expression"
			data-testid="filter-expression"
			onChange={(e): void => onChange(e.target.value)}
			onKeyDown={(e): void => {
				if (e.key === 'Enter') {
					onRun(e.currentTarget.value);
				}
			}}
		/>
	),
}));

const QUERY_RANGE_URL = `${ENVIRONMENT.baseURL}/api/v5/query_range`;
const TRACE_ID = '0000000000000000344ded1387b08a7e';

const spanRows = [
	{ data: { spanID: 'span-1' } },
	{ data: { spanID: 'span-2' } },
];

const getFilterExpression = (
	payload: QueryRangePayloadV5,
): string | undefined => {
	const spec = payload.compositeQuery.queries[0]?.spec as
		| { filter?: { expression: string } }
		| undefined;
	return spec?.filter?.expression;
};

const commit = (expression: string): void => {
	const input = screen.getByTestId('filter-expression');
	fireEvent.change(input, { target: { value: expression } });
	fireEvent.keyDown(input, { key: 'Enter' });
};

describe('Trace waterfall Filters', () => {
	let payloads: QueryRangePayloadV5[] = [];
	const onFilteredSpansChange = jest.fn();

	beforeEach(() => {
		payloads = [];
		onFilteredSpansChange.mockClear();
		server.use(
			rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
				payloads.push((await req.json()) as QueryRangePayloadV5);
				return res(
					ctx.status(200),
					ctx.json({
						data: {
							type: 'raw',
							data: { results: [{ queryName: 'A', rows: spanRows }] },
						},
					}),
				);
			}),
		);
		render(
			<Filters
				startTime={1700000000}
				endTime={1700003600}
				traceID={TRACE_ID}
				onFilteredSpansChange={onFilteredSpansChange}
				isExpanded
				onExpand={jest.fn()}
				onCollapse={jest.fn()}
			/>,
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('sends the committed expression scoped to the trace on v5 query_range', async () => {
		fireEvent.change(screen.getByTestId('filter-expression'), {
			target: { value: "service.name = 'frontend'" },
		});
		expect(payloads).toHaveLength(0);

		commit("service.name = 'frontend'");

		await waitFor(() => expect(payloads).toHaveLength(1));
		expect(getFilterExpression(payloads[0])).toBe(
			`(service.name = 'frontend') AND trace_id = '${TRACE_ID}'`,
		);
		await waitFor(() =>
			expect(onFilteredSpansChange).toHaveBeenLastCalledWith(
				['span-1', 'span-2'],
				true,
			),
		);
	});

	it.each(['has_error = true', "has_error = 'true'", 'has_error = TRUE'])(
		'reflects a committed %s on the highlight errors switch',
		async (expression) => {
			const toggle = screen
				.getByTestId('highlight-errors-toggle')
				.querySelector('[role="switch"]');
			expect(toggle).toHaveAttribute('aria-checked', 'false');

			commit(expression);

			await waitFor(() => expect(payloads).toHaveLength(1));
			expect(toggle).toHaveAttribute('aria-checked', 'true');
		},
	);

	it('keeps the highlight errors switch off for has_error != true', async () => {
		commit('has_error != true');

		await waitFor(() => expect(payloads).toHaveLength(1));
		expect(
			screen
				.getByTestId('highlight-errors-toggle')
				.querySelector('[role="switch"]'),
		).toHaveAttribute('aria-checked', 'false');
	});

	it('does not commit an expression that fails to parse', async () => {
		commit("service.name = 'frontend'");
		await waitFor(() => expect(payloads).toHaveLength(1));

		commit('service.name =');

		expect(payloads).toHaveLength(1);
		expect(onFilteredSpansChange).toHaveBeenLastCalledWith(
			['span-1', 'span-2'],
			true,
		);
	});

	it('clearing the filter drops the results without another request', async () => {
		commit("service.name = 'frontend'");
		await waitFor(() => expect(payloads).toHaveLength(1));

		fireEvent.click(screen.getByTestId('clear-filter'));

		expect(onFilteredSpansChange).toHaveBeenLastCalledWith([], false);
		expect(payloads).toHaveLength(1);
	});
});
