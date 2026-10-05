import { render, RenderResult } from 'tests/test-utils';
import { server, rest } from 'mocks-server/server';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import {
	FiltersType,
	IQuickFiltersConfig,
	QuickFilterCheckboxUseFieldApis,
	QuickFiltersSource,
} from '../../../types';
import CheckboxFilterV2 from './CheckboxFilterV2';

export const DEFAULT_FILTER: IQuickFiltersConfig = {
	type: FiltersType.CHECKBOX,
	title: 'Environment',
	attributeKey: {
		key: 'deployment.environment',
		dataType: DataTypes.String,
		type: 'tag',
	},
	dataSource: DataSource.TRACES,
	defaultOpen: true,
};

export const DEFAULT_USE_FIELD_APIS: QuickFilterCheckboxUseFieldApis = {
	startUnixMilli: 1700000000000,
	endUnixMilli: 1700003600000,
	existingQuery: null,
};

export function mockFieldsValuesAPI(response: {
	relatedValues?: (string | null)[];
	stringValues?: (string | null)[];
	numberValues?: (number | null)[];
	boolValues?: (boolean | null)[];
}): void {
	server.use(
		rest.get('http://localhost/api/v1/fields/values', (_, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						values: {
							relatedValues: response.relatedValues ?? [],
							stringValues: response.stringValues ?? [],
							numberValues: response.numberValues ?? [],
							boolValues: response.boolValues ?? [],
						},
					},
				}),
			),
		),
	);
}

/**
 * Records every request the AI observability values endpoint receives, so a test
 * can assert both the routing and the query params it was called with.
 */
export function mockAIObservabilityFieldsValuesAPI(response: {
	relatedValues?: (string | null)[];
	stringValues?: (string | null)[];
	numberValues?: (number | null)[];
}): { requests: URLSearchParams[] } {
	const requests: URLSearchParams[] = [];

	server.use(
		rest.get(
			'http://localhost/api/v1/ai_observability/fields/values',
			(req, res, ctx) => {
				requests.push(req.url.searchParams);

				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							values: {
								relatedValues: response.relatedValues ?? [],
								stringValues: response.stringValues ?? [],
								numberValues: response.numberValues ?? [],
							},
						},
					}),
				);
			},
		),
	);

	return { requests };
}

/** Fails the test if the signal-wide values endpoint is hit at all. */
export function forbidFieldsValuesAPI(): { called: boolean } {
	const state = { called: false };

	server.use(
		rest.get('http://localhost/api/v1/fields/values', (_, res, ctx) => {
			state.called = true;
			return res(ctx.status(200), ctx.json({ status: 'success', data: {} }));
		}),
	);

	return state;
}

export function mockFieldsValuesAPILoading(): void {
	server.use(
		rest.get('http://localhost/api/v1/fields/values', (_, res, ctx) =>
			res(ctx.delay(10000)),
		),
	);
}

export function setupServer(): void {
	beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
	afterEach(() => server.resetHandlers());
	afterAll(() => server.close());
}

// Components read currentQuery for the checkbox state and stagedQuery for the
// values fetch; in the app both are set by the same URL sync, so tests pass one
// query as both.
export function buildQueryBuilderOverrides(query: unknown): never {
	return { currentQuery: query, stagedQuery: query } as unknown as never;
}

export interface FilterItemConfig {
	op: string;
	value: string | string[];
}

export function renderWithFilter(
	onFilterChange: jest.Mock,
	filterItem?: FilterItemConfig,
): RenderResult {
	const items: TagFilterItem[] = filterItem
		? [
				{
					key: { key: 'deployment.environment' },
					op: filterItem.op,
					value: filterItem.value,
				} as TagFilterItem,
			]
		: [];

	return render(
		<CheckboxFilterV2
			filter={DEFAULT_FILTER}
			source={QuickFiltersSource.TRACES_EXPLORER}
			useFieldApis={{
				...DEFAULT_USE_FIELD_APIS,
				existingQuery: 'service.name = "api"',
			}}
			onFilterChange={onFilterChange}
		/>,
		undefined,
		{
			queryBuilderOverrides: buildQueryBuilderOverrides({
				builder: {
					queryData: [
						{
							filters: { items, op: 'AND' },
							filter: { expression: 'service.name = "api"' },
						},
					],
				},
			}),
		},
	);
}

export function getFilterFromCall(
	onFilterChange: jest.Mock,
	callIndex = 0,
): TagFilterItem | undefined {
	const query = onFilterChange.mock.calls[callIndex]?.[0] as Query | undefined;
	return query?.builder.queryData[0]?.filters?.items?.find(
		(item) => item.key?.key === 'deployment.environment',
	);
}
