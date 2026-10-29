import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent } from 'tests/test-utils';
import { useColumnStore } from 'components/TanStackTableView/useColumnStore';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueryAIWithType, PANEL_TYPES } from 'constants/queryBuilder';

import { TRACE_VIEW_DEFAULT_COLUMNS } from '../../constants';
import type { TracesTableProps } from '../../TracesTable/TracesTable';
import TracesView from '../TracesView';

jest.mock('../../TracesTable/TracesTable', () => ({
	__esModule: true,
	default: ({
		columns,
		onColumnOrderChange,
		onColumnRemove,
		onColumnSizingChange,
	}: TracesTableProps): JSX.Element => (
		<div>
			<div data-testid="table-columns">
				{columns.map((column) => String(column.header)).join(',')}
			</div>
			<button
				data-testid="reverse-columns"
				type="button"
				onClick={(): void => onColumnOrderChange?.([...columns].reverse())}
			>
				reverse
			</button>
			<button
				data-testid="remove-total-tokens"
				type="button"
				onClick={(): void => onColumnRemove?.('trace:total_tokens:float64')}
			>
				remove
			</button>
			<button
				data-testid="resize-trace-id"
				type="button"
				onClick={(): void => onColumnSizingChange?.({ trace_id: 240 })}
			>
				resize
			</button>
		</div>
	),
}));

const OPTIONS_KEY = LOCALSTORAGE.AI_OBSERVABILITY_OPTIONS;
const SIZING_KEY = LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_COLUMNS;
const QUERY_RANGE_URL = `${ENVIRONMENT.baseURL}/api/v5/query_range`;

const TOTAL_TOKENS = {
	name: 'total_tokens',
	fieldContext: 'trace',
	fieldDataType: 'float64',
};

const storedColumnNames = (): string[] | undefined => {
	const raw = localStorage.getItem(OPTIONS_KEY);
	return raw
		? (JSON.parse(raw)[PANEL_TYPES.TRACE] as { name: string }[]).map(
				(field) => field.name,
			)
		: undefined;
};

const shownColumns = (): string[] =>
	(screen.getByTestId('table-columns').textContent ?? '').split(',');

const renderTracesView = (): ReturnType<typeof render> =>
	render(
		<TracesView
			isFilterApplied={false}
			setWarning={jest.fn()}
			setIsLoadingQueries={jest.fn()}
		/>,
		{},
		{
			initialRoute: '/llm-observability/traces',
			queryBuilderOverrides: {
				panelType: PANEL_TYPES.TRACE,
				stagedQuery: initialQueryAIWithType,
				currentQuery: initialQueryAIWithType,
			} as never,
		},
	);

describe('TracesView columns', () => {
	beforeEach(() => {
		useColumnStore.setState({ tables: {} });
		localStorage.clear();
		server.use(
			rest.post(QUERY_RANGE_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: { type: 'trace', data: {} } })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('shows the default columns while nothing is picked, storing nothing', () => {
		renderTracesView();

		expect(shownColumns()).toStrictEqual(
			TRACE_VIEW_DEFAULT_COLUMNS.map((field) => field.name),
		);
		expect(localStorage.getItem(OPTIONS_KEY)).toBeNull();
	});

	it('shows trace_id first when a stored list lacks it', () => {
		localStorage.setItem(
			OPTIONS_KEY,
			JSON.stringify({ [PANEL_TYPES.TRACE]: [TOTAL_TOKENS] }),
		);

		renderTracesView();

		expect(shownColumns()).toStrictEqual(['trace_id', 'total_tokens']);
	});

	it('stores the order a column drag leaves behind', async () => {
		const user = userEvent.setup();
		localStorage.setItem(
			OPTIONS_KEY,
			JSON.stringify({
				[PANEL_TYPES.TRACE]: [{ name: 'trace_id' }, TOTAL_TOKENS],
			}),
		);
		renderTracesView();

		await user.click(screen.getByTestId('reverse-columns'));

		expect(storedColumnNames()).toStrictEqual(['total_tokens', 'trace_id']);
		expect(shownColumns()).toStrictEqual(['total_tokens', 'trace_id']);
	});

	it('drops a column removed from the table', async () => {
		const user = userEvent.setup();
		localStorage.setItem(
			OPTIONS_KEY,
			JSON.stringify({
				[PANEL_TYPES.TRACE]: [{ name: 'trace_id' }, TOTAL_TOKENS],
			}),
		);
		renderTracesView();

		await user.click(screen.getByTestId('remove-total-tokens'));

		expect(storedColumnNames()).toStrictEqual(['trace_id']);
		expect(shownColumns()).toStrictEqual(['trace_id']);
	});

	it('keeps column widths in the column store', async () => {
		const user = userEvent.setup();
		renderTracesView();

		await user.click(screen.getByTestId('resize-trace-id'));

		expect(
			useColumnStore.getState().tables[SIZING_KEY].columnSizing,
		).toStrictEqual({ trace_id: 240 });
		expect(localStorage.getItem(OPTIONS_KEY)).toBeNull();
	});
});
