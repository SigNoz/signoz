import { v4 as uuid } from 'uuid';
import {
	negateOperator,
	OPERATORS,
	QUERY_BUILDER_FUNCTIONS,
} from 'constants/antlrQueryConstants';
import { OPERATORS as QUERY_BUILDER_OPERATORS } from 'constants/queryBuilder';
import { RESTRICTED_SELECTED_FIELDS } from 'container/LogsFilters/config';
import { MetricsType } from 'container/MetricsApplication/constant';
import { getOperatorValue } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { LogAttributeBucket } from './constants';
import { generateFieldKeyForArray, getDataTypes } from './utils';

export const toTypedFilterValue = (value: unknown): string =>
	typeof value === 'number' || typeof value === 'boolean'
		? (value as unknown as string)
		: String(value);

export interface LogFilterTarget {
	fieldKey: string;
	filterInOperator: string;
	filterOutOperator: string;
	dataType?: DataTypes;
	metricsType?: MetricsType;
	groupBySupported: boolean;
	groupByKey?: string;
	isRestricted: boolean;
}

// Collapse a body forward path into the query-builder key segment; array indices become
// `[]` (json body on) or `[*]` (string body off — a distinct operator/search path).
//   ['items', 2, 'sku'] -> 'items[].sku' (json on)  / 'items[*].sku' (off)
//   ['tags', 0]         -> 'tags[]'      (json on)  / 'tags[*]'      (off)
const collapseBodyPath = (
	subpath: (string | number)[],
	isBodyJsonQueryEnabled: boolean,
): string => {
	const arrayMarker = isBodyJsonQueryEnabled ? '[]' : '[*]';
	let out = '';
	subpath.forEach((seg) => {
		if (typeof seg === 'number') {
			out += arrayMarker;
		} else {
			out += out ? `.${seg}` : seg;
		}
	});
	return out;
};

const metricsTypeForRoot = (root: string | number): MetricsType | undefined => {
	if (root === LogAttributeBucket.ATTRIBUTES) {
		return MetricsType.Tag;
	}
	if (root === LogAttributeBucket.RESOURCES) {
		return MetricsType.Resource;
	}
	if (root === LogAttributeBucket.SCOPE) {
		return MetricsType.Scope;
	}
	return undefined;
};

/**
 * Map a PrettyView leaf (forward keyPath) to its query-builder filter/group-by target:
 * scalars → `=`/`!=`, body array elements → `has`/`!has`; group-by gated by
 * `groupBySupported`. Attribute/resource/scope carry a `metricsType` (Tag/Resource/Scope).
 */
export const buildLogFilterTarget = (
	fieldKeyPath: (string | number)[],
	value: unknown,
	isBodyJsonQueryEnabled: boolean,
): LogFilterTarget => {
	const root = fieldKeyPath[0];

	// Attributes / resources / scope / top-level scalars: bare dotted key, =/!=.
	if (root !== 'body') {
		const fieldKey =
			fieldKeyPath.length > 1 ? fieldKeyPath.slice(1).join('.') : String(root);
		const isRestricted = RESTRICTED_SELECTED_FIELDS.includes(fieldKey);
		return {
			fieldKey,
			filterInOperator: OPERATORS['='],
			filterOutOperator: OPERATORS['!='],
			dataType: getDataTypes(value),
			metricsType: metricsTypeForRoot(root),
			groupBySupported: !isRestricted,
			groupByKey: isRestricted ? undefined : fieldKey,
			isRestricted,
		};
	}

	const subpath = fieldKeyPath.slice(1);

	// Whole-body leaf (unparsed string body): filter on the `body` field itself.
	if (subpath.length === 0) {
		return {
			fieldKey: 'body',
			filterInOperator: OPERATORS['='],
			filterOutOperator: OPERATORS['!='],
			dataType: getDataTypes(value),
			groupBySupported: false,
			isRestricted: false,
		};
	}

	const collapsed = collapseBodyPath(subpath, isBodyJsonQueryEnabled);
	const isArrayElement = typeof subpath[subpath.length - 1] === 'number';

	if (isArrayElement) {
		// has(body.<array>, value): generateFieldKeyForArray strips the trailing value
		// segment + `[]` exactly as the old BodyTitleRenderer.filterHandler did.
		const fieldKey = generateFieldKeyForArray(
			`${collapsed}.${String(value)}`,
			getDataTypes(value),
			isBodyJsonQueryEnabled,
		);
		return {
			fieldKey,
			filterInOperator: QUERY_BUILDER_FUNCTIONS.HAS,
			filterOutOperator: negateOperator(QUERY_BUILDER_FUNCTIONS.HAS),
			dataType: getDataTypes([value]),
			groupBySupported: false,
			isRestricted: false,
		};
	}

	const fieldKey = `body.${collapsed}`;
	// Restrict body leaves whose own key is a restricted field (e.g. a JSON body's own
	// `timestamp`/`id`/`date`) — hides filter / group-by, same as top-level fields.
	const leafKey = String(subpath[subpath.length - 1]);
	const isRestricted = RESTRICTED_SELECTED_FIELDS.includes(leafKey);
	// Group by only for plain body scalars (no array anywhere in the path) with json
	// body on — mirrors isGroupBySupported in the old BodyTitleRenderer.
	const groupBySupported =
		isBodyJsonQueryEnabled && !collapsed.includes('[]') && !isRestricted;
	return {
		fieldKey,
		filterInOperator: OPERATORS['='],
		filterOutOperator: OPERATORS['!='],
		dataType: getDataTypes(value),
		groupBySupported,
		groupByKey: groupBySupported ? fieldKey : undefined,
		isRestricted,
	};
};

const normalizeDataType = (
	dataType: DataTypes | undefined,
): DataTypes | undefined =>
	dataType && Object.values(DataTypes).includes(dataType) ? dataType : undefined;

// Append a filter item (filter-in / filter-out) to a query-data item. The autocomplete
// key is fabricated locally (empty source list), so no click-time getAggregateKeys fetch.
export const getFilterQueryData = (
	item: IBuilderQuery,
	target: LogFilterTarget,
	value: unknown,
	operator: string,
): IBuilderQuery => {
	const filterKey = chooseAutocompleteFromCustomValue(
		[],
		target.fieldKey,
		target.dataType,
		target.metricsType,
	);
	return {
		...item,
		filters: {
			items: [
				...(item.filters?.items || []),
				{
					id: uuid(),
					key: filterKey,
					op: getOperatorValue(operator),
					value: toTypedFilterValue(value),
				},
			],
			op: item.filters?.op || 'AND',
		},
	};
};

// Append a group-by. Caller guards groupBySupported / groupByKey.
export const getGroupByQueryData = (
	item: IBuilderQuery,
	target: LogFilterTarget,
): IBuilderQuery => {
	const newGroupByItem: BaseAutocompleteData = {
		key: target.groupByKey || '',
		type: target.metricsType || '',
		dataType: normalizeDataType(target.dataType),
	};
	return { ...item, groupBy: [...(item.groupBy || []), newGroupByItem] };
};

// Replace all filters with a single IN filter on this value.
export const getReplaceFilterQueryData = (
	item: IBuilderQuery,
	target: LogFilterTarget,
	value: unknown,
): IBuilderQuery => {
	const newFilterItem: BaseAutocompleteData = {
		key: target.fieldKey,
		type: target.metricsType || '',
		dataType: normalizeDataType(target.dataType),
	};
	return {
		...item,
		filters: {
			items: [
				{
					id: '',
					key: newFilterItem,
					op: QUERY_BUILDER_OPERATORS.IN,
					value: [toTypedFilterValue(value)],
				},
			],
			op: 'AND',
		},
		filter: { expression: '' },
	};
};
