import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';
import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useColumnStore } from 'components/TanStackTableView/useColumnStore';
import { LOCALSTORAGE } from 'constants/localStorage';
import { initialQueryAIWithType, PANEL_TYPES } from 'constants/queryBuilder';

import TracesView from '../TracesView';

const STORAGE_KEY = LOCALSTORAGE.AI_OBSERVABILITY_TRACE_VIEW_COLUMNS;
const PERSISTED_KEY = `@signoz/table-columns/${STORAGE_KEY}`;
const QUERY_RANGE_URL = `${ENVIRONMENT.baseURL}/api/v5/query_range`;
const FIELD_KEYS_URL = `${ENVIRONMENT.baseURL}/api/v1/ai_observability/fields/keys`;

const OPTIONS_TRIGGER = 'options_menu.options';

const ROWS = [
	{
		timestamp: '2024-07-19T08:39:58.735245Z',
		data: {
			'service.name': 'checkout',
			root_span_name: 'HTTP GET',
			trace_duration_nano: 55306000,
			span_count: 8,
			trace_id: '0000000000000000344ded1387b08a7e',
		},
	},
];

const mockRows = (): void => {
	server.use(
		rest.post(QUERY_RANGE_URL, (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					data: {
						type: 'trace',
						data: { results: [{ queryName: 'A', rows: ROWS }] },
					},
				}),
			),
		),
	);
};

const mockFieldKeys = (names: string[]): void => {
	server.use(
		rest.get(FIELD_KEYS_URL, (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						complete: true,
						keys: Object.fromEntries(
							names.map((name) => [
								name,
								[
									{
										name,
										fieldContext: TelemetrytypesFieldContextDTO.trace,
										fieldDataType: TelemetrytypesFieldDataTypeDTO.float64,
									},
								],
							]),
						),
					},
				}),
			),
		),
	);
};

const mockFieldKeysFailure = (): void => {
	server.use(
		rest.get(FIELD_KEYS_URL, (_req, res, ctx) =>
			res(ctx.status(500), ctx.json({ status: 'error' })),
		),
	);
};

const persistedState = (): { hiddenColumnIds: string[] } | null => {
	const raw = localStorage.getItem(PERSISTED_KEY);
	return raw ? (JSON.parse(raw) as { hiddenColumnIds: string[] }) : null;
};

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

describe('TracesView column persistence', () => {
	beforeEach(() => {
		useColumnStore.setState({ tables: {} });
		localStorage.clear();
		mockRows();
	});

	afterEach(() => {
		server.resetHandlers();
	});

	// Rows are virtualised, so a mounted table stands in for "rows arrived".
	const findTable = (): Promise<HTMLElement> => screen.findByRole('table');

	it('seeds the persisted defaults once the field keys arrive', async () => {
		mockFieldKeys(['llm_call_count', 'tool_call_count']);
		renderTracesView();

		await findTable();

		await waitFor(() => {
			expect(persistedState()?.hiddenColumnIds).toStrictEqual([
				'start_time',
				'end_time',
				'error_count',
				'input',
				'output',
				'trace:tool_call_count:float64',
			]);
		});
		expect(screen.getByText(OPTIONS_TRIGGER)).toBeInTheDocument();
		expect(screen.getByText('llm_call_count')).toBeInTheDocument();
	});

	it('persists nothing when the field keys fail', async () => {
		mockFieldKeysFailure();
		renderTracesView();

		await findTable();

		expect(useColumnStore.getState().tables[STORAGE_KEY]).toBeUndefined();
		expect(persistedState()).toBeNull();
	});

	it('drops the column picker when the field keys fail', async () => {
		mockFieldKeysFailure();
		renderTracesView();

		await findTable();

		expect(screen.queryByText(OPTIONS_TRIGGER)).not.toBeInTheDocument();
	});

	it('renders only the default-visible columns when the field keys fail', async () => {
		mockFieldKeysFailure();
		renderTracesView();

		await findTable();

		expect(screen.getByText('root_span_name')).toBeInTheDocument();
		expect(screen.getByText('trace_id')).toBeInTheDocument();
		expect(screen.queryByText('input')).not.toBeInTheDocument();
		expect(screen.queryByText('output')).not.toBeInTheDocument();
	});

	it('leaves an existing selection untouched while the field keys fail', async () => {
		const existing = {
			hiddenColumnIds: ['trace:tool_call_count:float64', 'input', 'output'],
			columnOrder: ['trace_id', 'resource:service.name'],
			columnSizing: {},
		};
		localStorage.setItem(PERSISTED_KEY, JSON.stringify(existing));

		mockFieldKeysFailure();
		renderTracesView();

		await findTable();

		expect(persistedState()).toStrictEqual(existing);
	});
});
