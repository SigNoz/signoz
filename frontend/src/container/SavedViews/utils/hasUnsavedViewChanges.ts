import { mapCompositeQueryFromQuery } from 'lib/newQueryBuilder/queryBuilderMappers/mapCompositeQueryFromQuery';
import isEqual from 'lodash-es/isEqual';
import { DataSource } from 'types/common/queryBuilder';

import { HasUnsavedViewChangesArgs } from '../types';
import { getSavedViewQuery } from './getSavedViewQuery';
import { toSavedViewPanelType } from './toSavedViewSpec';
import { getViewColumnsAndFormatting } from './getViewColumnsAndFormatting';

// The server drops empty values when it stores a query, while the query
// builder fills them with defaults, so both sides lose them before comparing.
function withoutEmptyValues(value: unknown): unknown {
	if (Array.isArray(value)) {
		const items = value
			.map(withoutEmptyValues)
			.filter((item) => item !== undefined);
		return items.length > 0 ? items : undefined;
	}
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value)
			.map(([key, item]) => [key, withoutEmptyValues(item)] as const)
			.filter(([, item]) => item !== undefined);
		return entries.length > 0 ? Object.fromEntries(entries) : undefined;
	}
	if (value === null || value === '' || value === 0) {
		return undefined;
	}
	return value;
}

// Both sides go through the v5 mapper, so fields it never writes (reduceTo on
// a graph in older views) drop out; the builder's shape gets different defaults.
export function hasUnsavedViewChanges({
	view,
	stagedQuery,
	panelType,
	options,
}: HasUnsavedViewChangesArgs): boolean {
	if (!stagedQuery) {
		return false;
	}
	if (view.spec.panelType !== toSavedViewPanelType(panelType)) {
		return true;
	}

	const { queries: storedQueries } = mapCompositeQueryFromQuery(
		getSavedViewQuery(view),
		panelType,
	);
	const { queries: stagedQueries } = mapCompositeQueryFromQuery(
		stagedQuery,
		panelType,
	);
	if (
		!isEqual(withoutEmptyValues(storedQueries), withoutEmptyValues(stagedQueries))
	) {
		return true;
	}

	if (!options) {
		return false;
	}

	const dataSource = stagedQuery.builder.queryData[0]?.dataSource;
	const { columns, formatting } = getViewColumnsAndFormatting(
		view.spec,
		dataSource,
	);
	const toNames = (fields: { name?: string; key?: string }[]): unknown[] =>
		fields.map((field) => field.name ?? field.key);
	if (!isEqual(toNames(columns), toNames(options.selectColumns ?? []))) {
		return true;
	}

	if (dataSource !== DataSource.LOGS || !formatting) {
		return false;
	}
	return (
		formatting.format !== options.format ||
		formatting.maxLines !== options.maxLines ||
		formatting.fontSize !== options.fontSize
	);
}
