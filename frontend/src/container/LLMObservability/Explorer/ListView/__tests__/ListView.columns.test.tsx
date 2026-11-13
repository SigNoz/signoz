import type { ComponentProps, MutableRefObject } from 'react';
import type { QueryKey } from 'react-query';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import type { TelemetryFieldKey } from 'api/v5/v5';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { initialQueryAIWithType, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import store from 'store';
import { UPDATE_TIME_INTERVAL } from 'types/actions/globalTime';
import type {
	BuilderQuery,
	QueryRangeRequestV5,
} from 'types/api/v5/queryRange';

import type TraceExplorerControls from '../../Controls';
import type { TracesTableProps } from '../../TracesTable/TracesTable';
import { defaultSelectedColumns } from '../configs';
import ListView from '../ListView';

const mockAddedField: TelemetryFieldKey = {
	name: 'gen_ai.request.model',
	signal: 'traces',
	fieldContext: 'attribute',
	fieldDataType: 'string',
};

jest.mock('../../Controls', () => ({
	__esModule: true,
	default: ({
		config,
	}: ComponentProps<typeof TraceExplorerControls>): JSX.Element => {
		const fieldsSelector = config?.fieldsSelector;
		return (
			<button
				data-testid="add-column"
				type="button"
				onClick={(): void =>
					fieldsSelector?.onFieldsChange([...fieldsSelector.value, mockAddedField])
				}
			>
				add
			</button>
		);
	},
}));

jest.mock('../../TracesTable/TracesTable', () => ({
	__esModule: true,
	default: ({
		columns,
		onColumnOrderChange,
		onColumnRemove,
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
				data-testid="remove-status-code"
				type="button"
				onClick={(): void => onColumnRemove?.('span:response_status_code')}
			>
				remove
			</button>
		</div>
	),
}));

const QUERY_RANGE_URL = `${ENVIRONMENT.baseURL}/api/v5/query_range`;
const LIST_VIEW_ROUTE = `${ROUTES.AI_OBSERVABILITY_EXPLORER}?${
	QueryParams.panelTypes
}=${encodeURIComponent(JSON.stringify(PANEL_TYPES.LIST))}`;

const DEFAULT_NAMES = defaultSelectedColumns.map((field) => field.name);

let requestedFields: string[][] = [];

const shownColumns = (): string[] =>
	(screen.getByTestId('table-columns').textContent ?? '').split(',');

const renderListView = (
	queryKeyRef?: MutableRefObject<QueryKey | undefined>,
): ReturnType<typeof render> =>
	render(
		<ListView
			isFilterApplied={false}
			setWarning={jest.fn()}
			setIsLoadingQueries={jest.fn()}
			queryKeyRef={queryKeyRef}
		/>,
		{},
		{
			initialRoute: LIST_VIEW_ROUTE,
			queryBuilderOverrides: {
				panelType: PANEL_TYPES.LIST,
				stagedQuery: initialQueryAIWithType,
				currentQuery: initialQueryAIWithType,
			} as never,
		},
	);

describe('ListView columns', () => {
	beforeAll(() => {
		// The list waits until the global time range has loaded.
		const { minTime, maxTime, selectedTime } = store.getState().globalTime;
		store.dispatch({
			type: UPDATE_TIME_INTERVAL,
			payload: { minTime, maxTime, selectedTime },
		});
	});

	beforeEach(() => {
		localStorage.clear();
		requestedFields = [];
		server.use(
			rest.post(QUERY_RANGE_URL, async (req, res, ctx) => {
				const body = (await req.json()) as QueryRangeRequestV5;
				const spec = body.compositeQuery.queries[0].spec as BuilderQuery;
				requestedFields.push((spec.selectFields ?? []).map((field) => field.name));
				return res(
					ctx.status(200),
					ctx.json({ data: { type: 'raw', data: { results: [] } } }),
				);
			}),
		);
	});

	it('refetches with the columns added or removed', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderListView();
		await waitFor(() => expect(requestedFields).toStrictEqual([DEFAULT_NAMES]));

		await user.click(screen.getByTestId('add-column'));

		await waitFor(() => expect(requestedFields).toHaveLength(2));
		expect(requestedFields[1]).toStrictEqual([
			...DEFAULT_NAMES,
			mockAddedField.name,
		]);

		await user.click(screen.getByTestId('remove-status-code'));

		await waitFor(() => expect(requestedFields).toHaveLength(3));
		expect(requestedFields[2]).toStrictEqual([
			...DEFAULT_NAMES.filter((name) => name !== 'response_status_code'),
			mockAddedField.name,
		]);
	});

	it('reorders the columns without refetching', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const queryKeyRef: MutableRefObject<QueryKey | undefined> = {
			current: undefined,
		};
		renderListView(queryKeyRef);
		await waitFor(() => expect(requestedFields).toHaveLength(1));
		const initialQueryKey = queryKeyRef.current;

		await user.click(screen.getByTestId('reverse-columns'));

		expect(shownColumns()).toStrictEqual([
			'timestamp',
			...[...DEFAULT_NAMES].reverse(),
		]);
		expect(queryKeyRef.current).toStrictEqual(initialQueryKey);
		expect(requestedFields).toHaveLength(1);
	});

	it('restores the stored list columns', async () => {
		localStorage.setItem(
			LOCALSTORAGE.AI_OBSERVABILITY_PANEL_COLUMNS,
			JSON.stringify({ [PANEL_TYPES.LIST]: [mockAddedField] }),
		);

		renderListView();

		expect(shownColumns()).toStrictEqual(['timestamp', mockAddedField.name]);
		await waitFor(() =>
			expect(requestedFields).toStrictEqual([[mockAddedField.name]]),
		);
	});
});
