/**
 * AI Assistant page-action factories for the Logs Explorer.
 *
 * Each factory closes over live page state/callbacks so that `execute()`
 * always operates on the current query. The page component instantiates these
 * with `useMemo` and passes them to `usePageActions`.
 *
 * Filter flow: the V5 query-builder UI binds the WHERE clause CodeMirror
 * editor to `currentQuery.builder.queryData[0].filter.expression`. So we
 * derive the expression from our items via `convertFiltersToExpression`
 * (the same helper `useGetCompositeQueryParam` uses on URL parse) and push
 * BOTH `filters.items` and `filter.expression` into the QueryBuilder
 * provider via `handleSetQueryData`. We then call `redirectWithQueryBuilderData`
 * so the change persists in the URL — and because the items + expression we
 * write match what the URL parser would derive from items alone, the post-
 * navigate state stays consistent with the immediate UI update.
 */

import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
import {
	aiFilterToTagFilterItem,
	FILTER_OP_ENUM,
	FILTER_VALUE_DESCRIPTION,
	FilterDeps,
	replaceFirstQueryData,
} from 'container/AIAssistant/pageActions/builderQueryHelpers';
import {
	ActionResult,
	PageAction,
} from 'container/AIAssistant/pageActions/types';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';

interface AIFilter {
	key: string;
	op: string;
	value: string;
}

interface RunQueryParams {
	filters: AIFilter[];
}

interface AddFilterParams {
	key: string;
	op: string;
	value: string;
}

interface ChangeViewParams {
	view: 'list' | 'timeseries' | 'table';
}

interface SaveViewParams {
	name: string;
}

/**
 * Replace all active filters and navigate to the updated query URL
 * (which makes the WHERE clause reflect the new filters and triggers a re-run).
 */
export function logsRunQueryAction(
	deps: FilterDeps,
): PageAction<RunQueryParams> {
	return {
		id: 'logs.runQuery',
		description: 'Replace the active log filters and re-run the query',
		parameters: {
			type: 'object',
			properties: {
				filters: {
					type: 'array',
					description: 'Replacement filter list',
					items: {
						type: 'object',
						properties: {
							key: {
								type: 'string',
								description: 'Attribute key, e.g. severity_text',
							},
							op: {
								type: 'string',
								enum: [...FILTER_OP_ENUM],
							},
							value: {
								type: 'string',
								description: FILTER_VALUE_DESCRIPTION,
							},
						},
						required: ['key', 'op', 'value'],
					},
				},
			},
			required: ['filters'],
		},
		autoApply: true,
		execute: async ({ filters }): Promise<ActionResult> => {
			const baseQuery = deps.currentQuery.builder.queryData[0];
			if (!baseQuery) {
				throw new Error('No active query found in Logs Explorer.');
			}

			const tagItems = filters.map(aiFilterToTagFilterItem);
			const newFilters = { items: tagItems, op: 'AND' };
			const updatedBuilderQuery: IBuilderQuery = {
				...baseQuery,
				filters: newFilters,
				filter: convertFiltersToExpression(newFilters),
			};

			// Push to in-memory state first so the WHERE clause re-renders without
			// waiting on a URL round-trip. Then sync URL for persistence/sharing.
			deps.handleSetQueryData(0, updatedBuilderQuery);
			deps.redirectWithQueryBuilderData(
				replaceFirstQueryData(deps.currentQuery, updatedBuilderQuery),
			);

			return {
				summary: `Query updated with ${filters.length} filter(s) and re-run.`,
			};
		},
		getContext: (): Record<string, unknown> => ({
			filters:
				deps.currentQuery.builder.queryData[0]?.filters?.items?.map(
					(f: TagFilterItem) => ({
						key: f.key?.key,
						op: f.op,
						value: f.value,
					}),
				) ?? [],
		}),
	};
}

/**
 * Append a single filter to the existing query and navigate to the updated URL.
 */
export function logsAddFilterAction(
	deps: FilterDeps,
): PageAction<AddFilterParams> {
	return {
		id: 'logs.addFilter',
		description: 'Add a single filter to the current log query and re-run',
		parameters: {
			type: 'object',
			properties: {
				key: {
					type: 'string',
					description: 'Attribute key, e.g. severity_text',
				},
				op: {
					type: 'string',
					enum: [...FILTER_OP_ENUM],
				},
				value: {
					type: 'string',
					description: FILTER_VALUE_DESCRIPTION,
				},
			},
			required: ['key', 'op', 'value'],
		},
		autoApply: true,
		execute: async ({ key, op, value }): Promise<ActionResult> => {
			const baseQuery = deps.currentQuery.builder.queryData[0];
			if (!baseQuery) {
				throw new Error('No active query found in Logs Explorer.');
			}

			const existing = baseQuery.filters?.items ?? [];
			const newItem = aiFilterToTagFilterItem({ key, op, value });
			const newFilters = { items: [...existing, newItem], op: 'AND' };
			const updatedBuilderQuery: IBuilderQuery = {
				...baseQuery,
				filters: newFilters,
				filter: convertFiltersToExpression(newFilters),
			};

			deps.handleSetQueryData(0, updatedBuilderQuery);
			deps.redirectWithQueryBuilderData(
				replaceFirstQueryData(deps.currentQuery, updatedBuilderQuery),
			);

			return { summary: `Filter added: ${key} ${op} "${value}". Query re-run.` };
		},
	};
}

/**
 * Switch the explorer between list / timeseries / table views.
 */
export function logsChangeViewAction(deps: {
	onChangeView: (view: 'list' | 'timeseries' | 'table') => void;
}): PageAction<ChangeViewParams> {
	return {
		id: 'logs.changeView',
		description:
			'Switch the Logs Explorer between list, timeseries, and table views',
		parameters: {
			type: 'object',
			properties: {
				view: {
					type: 'string',
					enum: ['list', 'timeseries', 'table'],
					description: 'The panel view to switch to',
				},
			},
			required: ['view'],
		},
		execute: async ({ view }): Promise<ActionResult> => {
			deps.onChangeView(view);
			return { summary: `Switched to the "${view}" view.` };
		},
	};
}

/**
 * Save the current query as a named view (stub — wires to real API when available).
 */
export function logsSaveViewAction(deps: {
	onSaveView: (name: string) => Promise<void>;
}): PageAction<SaveViewParams> {
	return {
		id: 'logs.saveView',
		description: 'Save the current log query as a named view',
		parameters: {
			type: 'object',
			properties: {
				name: { type: 'string', description: 'Name for the saved view' },
			},
			required: ['name'],
		},
		execute: async ({ name }): Promise<ActionResult> => {
			await deps.onSaveView(name);
			return { summary: `View "${name}" saved.` };
		},
	};
}
