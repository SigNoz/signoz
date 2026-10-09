import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas';
import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import type {
	PanelQueryData,
	PanelTable,
	PanelTableColumn,
	PanelTableRow,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { getScalarResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

import type { TopListData, TopListRow } from './types';

export const EMPTY_LABEL = '(empty)';

const LABEL_SEPARATOR = ' · ';
const LEGEND_VARIABLE = /\{\{\s*([^}]+?)\s*\}\}/g;

const EMPTY_DATA: TopListData = {
	rows: [],
	labelColumnNames: [],
	valueColumnName: '',
	valueName: '',
	ignoredValueColumns: [],
	ignoredResults: [],
	orderedByGroupKey: null,
};

/** A missing group value is `null` for traces/logs and `""` for metrics. */
function isMissing(value: unknown): boolean {
	return value == null || value === '';
}

/** Finite numbers only: the server sends NaN/±Inf as "NaN"/"Inf"/"-Inf" and a missing value as "n/a". */
function toFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function toGroupValue(value: unknown): string {
	return typeof value === 'object'
		? JSON.stringify(value)
		: String(value as string | number | boolean);
}

function getCell(row: PanelTableRow, column: PanelTableColumn): unknown {
	return row.data[column.id || column.name];
}

function resolveLabel(
	labelColumns: PanelTableColumn[],
	row: PanelTableRow,
	labels: Record<string, string>,
	table: PanelTable,
): Pick<TopListRow, 'label' | 'isEmptyLabel'> {
	if (table.legend) {
		// Unlike `getLabelName`, a key the row doesn't carry renders empty, not "undefined".
		const label = table.legend.replace(
			LEGEND_VARIABLE,
			(_, key: string) => labels[key] ?? '',
		);
		return { label, isEmptyLabel: false };
	}
	if (labelColumns.length === 0) {
		return { label: table.queryName, isEmptyLabel: false };
	}

	const parts = labelColumns.map((column) => getCell(row, column));
	if (parts.every(isMissing)) {
		return { label: EMPTY_LABEL, isEmptyLabel: true };
	}
	return {
		label: parts
			.map((part) => (isMissing(part) ? EMPTY_LABEL : toGroupValue(part)))
			.join(LABEL_SEPARATOR),
		isEmptyLabel: false,
	};
}

type SortDirection = 'asc' | 'desc';

/** By value in the query's direction; non-numeric values last; ties by label so the order is stable across refreshes. */
function compareRows(direction: SortDirection) {
	return (a: TopListRow, b: TopListRow): number => {
		if (a.value === null || b.value === null) {
			if (a.value === b.value) {
				return a.label.localeCompare(b.label);
			}
			return a.value === null ? 1 : -1;
		}
		const byValue = direction === 'asc' ? a.value - b.value : b.value - a.value;
		return byValue || a.label.localeCompare(b.label);
	};
}

interface NamedQuerySpec {
	name?: string;
	/** Formulas. */
	expression?: string;
	aggregations?: {
		alias?: string;
		expression?: string;
		metricName?: string;
		spaceAggregation?: string;
	}[];
}

function findQuerySpec(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
	queryName: string,
): NamedQuerySpec | undefined {
	return (requestPayload?.compositeQuery?.queries ?? [])
		.map((envelope) => envelope.spec as NamedQuerySpec | undefined)
		.find((candidate) => candidate?.name === queryName);
}

const AGGREGATION_FUNCTION = /^\s*([a-z_]\w*)\s*\(/i;

/**
 * The ranked aggregation's function, lowercased: `p99` for `p99(duration_nano)`, the space
 * aggregation for a metric. Null for formulas and ClickHouse SQL, which have none to read.
 */
export function getRankedAggregationFunction(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
	queryName: string,
): string | null {
	const [aggregation] =
		findQuerySpec(requestPayload, queryName)?.aggregations ?? [];
	const name =
		aggregation?.expression?.match(AGGREGATION_FUNCTION)?.[1] ??
		aggregation?.spaceAggregation;
	return name ? name.toLowerCase() : null;
}

/** The ranked aggregation as the query writes it: its alias, expression or formula. */
function describeValue(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
	queryName: string,
): string | null {
	const spec = findQuerySpec(requestPayload, queryName);
	const [aggregation] = spec?.aggregations ?? [];
	if (aggregation?.alias || aggregation?.expression) {
		return aggregation.alias || aggregation.expression || null;
	}
	if (aggregation?.metricName) {
		return aggregation.spaceAggregation
			? `${aggregation.spaceAggregation}(${aggregation.metricName})`
			: aggregation.metricName;
	}
	return spec?.expression || null;
}

interface OrderedQuerySpec {
	name?: string;
	order?: { key?: { name?: string }; direction?: string }[];
	groupBy?: { name?: string }[];
}

interface RankedOrder {
	direction: SortDirection;
	groupKey: string | null;
}

/**
 * How the ranked query orders its rows. The server orders by value, descending, when
 * no order is set; ordering by a group-by key returns the first N groups by that key.
 */
function getRankedOrder(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
	queryName: string | undefined,
): RankedOrder {
	const spec = (requestPayload?.compositeQuery?.queries ?? [])
		.map((envelope) => envelope.spec as OrderedQuerySpec | undefined)
		.find((candidate) => candidate?.name === queryName);
	const [order] = spec?.order ?? [];
	const keyName = order?.key?.name;
	if (!keyName) {
		return { direction: 'desc', groupKey: null };
	}
	if (spec?.groupBy?.some((key) => key.name === keyName)) {
		return { direction: 'desc', groupKey: keyName };
	}
	return {
		direction: order.direction === 'asc' ? 'asc' : 'desc',
		groupKey: null,
	};
}

/** The request's queries and formulas, in builder order. */
function getQueryOrder(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
): string[] {
	return (requestPayload?.compositeQuery?.queries ?? [])
		.map((envelope) => envelope.spec?.name)
		.filter((name): name is string => Boolean(name));
}

/** Tables in builder order; the response lists them in no particular order. */
function orderTables(tables: PanelTable[], queryOrder: string[]): PanelTable[] {
	const position = (table: PanelTable): number => {
		const index = queryOrder.indexOf(table.queryName);
		return index === -1 ? queryOrder.length : index;
	};
	return [...tables].sort((a, b) => position(a) - position(b));
}

const hasValueColumn = (table: PanelTable): boolean =>
	table.columns.some((column) => column.isValueColumn);

/**
 * Ranks the first value column of the first table that has one. The server already
 * orders and limits, but its order isn't stable on ties, so the rows are sorted again here.
 * A query ordered by a group key still lists by value: its rows are the first N groups.
 */
export function prepareTopListRows(
	tables: PanelTable[],
	direction: SortDirection = 'desc',
): TopListData {
	const [table, ...otherTables] = tables.filter(hasValueColumn);
	if (!table) {
		return EMPTY_DATA;
	}

	const [valueColumn, ...ignoredColumns] = table.columns.filter(
		(column) => column.isValueColumn,
	);
	const labelColumns = table.columns.filter((column) => !column.isValueColumn);

	const rows = table.rows.map((row, index): TopListRow => {
		const labels: Record<string, string> = {};
		labelColumns.forEach((column) => {
			const value = getCell(row, column);
			if (value != null) {
				labels[column.name] = toGroupValue(value);
			}
		});

		const rawValue = getCell(row, valueColumn);
		return {
			key: `${table.queryName}-${index}`,
			...resolveLabel(labelColumns, row, labels, table),
			value: toFiniteNumber(rawValue),
			rawValue,
			ratio: 0,
			share: null,
			queryName: valueColumn.queryName,
			labels,
		};
	});

	const values = rows
		.map((row) => row.value)
		.filter((value): value is number => value !== null);
	const max = Math.max(0, ...values);
	const total = values.some((value) => value < 0)
		? 0
		: values.reduce((sum, value) => sum + value, 0);
	rows.forEach((row) => {
		row.ratio =
			max > 0 && row.value !== null && row.value > 0 ? row.value / max : 0;
		row.share = total > 0 && row.value !== null ? row.value / total : null;
	});

	return {
		rows: rows.sort(compareRows(direction)),
		labelColumnNames: labelColumns.map((column) => column.name),
		valueColumnName: valueColumn.name,
		// A lone aggregation's column takes the legend, which labels rows here, not values.
		valueName:
			table.legend && valueColumn.name === table.legend
				? valueColumn.queryName
				: valueColumn.name,
		ignoredValueColumns: ignoredColumns.map((column) => column.name),
		ignoredResults: otherTables.map((other) => other.queryName),
		orderedByGroupKey: null,
	};
}

/** Ranks the first enabled query or formula, in builder order, in its order direction. */
export function prepareTopListData(data: PanelQueryData): TopListData {
	const tables = prepareScalarTables({
		results: getScalarResults(data.response),
		legendMap: data.legendMap ?? {},
		requestPayload: data.requestPayload,
	});
	const ordered = orderTables(tables, getQueryOrder(data.requestPayload));
	const { direction, groupKey } = getRankedOrder(
		data.requestPayload,
		ordered.find(hasValueColumn)?.queryName,
	);
	const prepared = prepareTopListRows(ordered, direction);
	const rankedQuery = prepared.rows[0]?.queryName;
	// A bare query name ("A") says nothing about the value; the query spec can.
	const valueName =
		rankedQuery && prepared.valueName === rankedQuery
			? (describeValue(data.requestPayload, rankedQuery) ?? rankedQuery)
			: prepared.valueName;
	return { ...prepared, valueName, orderedByGroupKey: groupKey };
}
