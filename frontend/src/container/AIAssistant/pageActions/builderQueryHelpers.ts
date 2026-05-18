/**
 * Shared helpers for AI-Assistant page actions that mutate the QueryBuilder
 * state on logs/traces/metrics explorers. These keep the per-page action
 * factories thin so they only need to declare ids, descriptions, and schemas.
 */

import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	Query,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuidv4 } from 'uuid';

/** Param shape emitted by the AI for every filter-touching action. */
export interface AIFilter {
	key: string;
	op: string;
	value: string;
}

/**
 * IN / NOT_IN operators expect an array of values, not a single string. The
 * AI is asked to pass comma-separated values for these ops via the schema's
 * `value: string` field, so we split here. Other ops keep the raw string —
 * matches how the query-builder UI itself stores them.
 */
export function valueForOp(op: string, value: string): TagFilterItem['value'] {
	if (op === 'IN' || op === 'NOT_IN') {
		return value
			.split(',')
			.map((v) => v.trim())
			.filter((v) => v.length > 0);
	}
	return value;
}

export function aiFilterToTagFilterItem(f: AIFilter): TagFilterItem {
	// Defaults for `type` (autocomplete category) and `dataType` mirror what
	// the query-builder writes when a user types a free-form filter the
	// autocomplete hasn't seen yet — without them the filter chip can fail
	// to render in the WHERE clause.
	const key: BaseAutocompleteData = {
		key: f.key,
		type: '',
		dataType: DataTypes.String,
	};
	return { id: uuidv4(), key, op: f.op, value: valueForOp(f.op, f.value) };
}

/** Return a new Query with the first builder queryData entry replaced. */
export function replaceFirstQueryData(
	query: Query,
	updated: IBuilderQuery,
): Query {
	const queryData = [...query.builder.queryData];
	queryData[0] = updated;
	return {
		...query,
		builder: { ...query.builder, queryData },
	};
}

/** Page-state deps required by the runQuery / addFilter actions. */
export interface FilterDeps {
	currentQuery: Query;
	handleSetQueryData: (index: number, newQueryData: IBuilderQuery) => void;
	redirectWithQueryBuilderData: (query: Query) => void;
}

/** JSON-Schema enum of operators the AI is allowed to emit. */
export const FILTER_OP_ENUM = [
	'=',
	'!=',
	'IN',
	'NOT_IN',
	'CONTAINS',
	'NOT_CONTAINS',
] as const;

/** Description shared across action schemas for the `value` field. */
export const FILTER_VALUE_DESCRIPTION =
	'For IN / NOT_IN, comma-separated values (e.g. "ERROR,FATAL"). Otherwise a single value.';
