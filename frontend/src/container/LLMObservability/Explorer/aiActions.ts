/**
 * AI Assistant page-action factories for the Traces Explorer.
 *
 * Mirrors the logs equivalents — each factory closes over live page
 * state/callbacks so `execute()` always operates on the current query, and
 * the page component instantiates them via `useMemo` + `usePageActions`.
 *
 * See `pages/LogsExplorer/aiActions.ts` for the rationale behind writing
 * BOTH `filters.items` and `filter.expression` and then re-using the same
 * URL parser shape via `redirectWithQueryBuilderData`.
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

type TracesView = 'list' | 'timeseries' | 'table' | 'trace';

interface ChangeViewParams {
	view: TracesView;
}

interface SaveViewParams {
	name: string;
}

/**
 * Replace all active span filters and navigate to the updated query URL
 * (which makes the WHERE clause reflect the new filters and triggers a re-run).
 */
export function tracesRunQueryAction(
	deps: FilterDeps,
): PageAction<RunQueryParams> {
	return {
		id: 'traces.runQuery',
		description: 'Replace the active trace filters and re-run the query',
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
								description: 'Attribute key, e.g. service.name, http.status_code',
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
				throw new Error('No active query found in Traces Explorer.');
			}

			const tagItems = filters.map(aiFilterToTagFilterItem);
			const newFilters = { items: tagItems, op: 'AND' };
			const updatedBuilderQuery: IBuilderQuery = {
				...baseQuery,
				filters: newFilters,
				filter: convertFiltersToExpression(newFilters),
			};

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
 * Append a single filter to the existing trace query and navigate to the
 * updated URL.
 */
export function tracesAddFilterAction(
	deps: FilterDeps,
): PageAction<AddFilterParams> {
	return {
		id: 'traces.addFilter',
		description: 'Add a single filter to the current trace query and re-run',
		parameters: {
			type: 'object',
			properties: {
				key: {
					type: 'string',
					description: 'Attribute key, e.g. service.name, http.status_code',
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
				throw new Error('No active query found in Traces Explorer.');
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
 * Switch the traces explorer between list / timeseries / table / trace views.
 */
export function tracesChangeViewAction(deps: {
	onChangeView: (view: TracesView) => void;
}): PageAction<ChangeViewParams> {
	return {
		id: 'traces.changeView',
		description:
			'Switch the Traces Explorer between list, timeseries, table, and trace views',
		parameters: {
			type: 'object',
			properties: {
				view: {
					type: 'string',
					enum: ['list', 'timeseries', 'table', 'trace'],
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
 * Save the current trace query as a named view (stub — wires to real API
 * when available).
 */
export function tracesSaveViewAction(deps: {
	onSaveView: (name: string) => Promise<void>;
}): PageAction<SaveViewParams> {
	return {
		id: 'traces.saveView',
		description: 'Save the current trace query as a named view',
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
