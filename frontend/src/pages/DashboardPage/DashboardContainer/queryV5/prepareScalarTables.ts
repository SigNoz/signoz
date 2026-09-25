import type {
	Querybuildertypesv5ColumnDescriptorDTO,
	Querybuildertypesv5QueryRangeRequestDTO,
	Querybuildertypesv5ScalarDataDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
	Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType,
} from 'api/generated/services/sigNoz.schemas';

import type { PanelTable, PanelTableColumn } from './types';

// Narrow view over a builder-query aggregation; envelope spec is `unknown`, so naming reads
// through this view with a localized cast at the boundary.
export interface AggregationView {
	alias?: string;
	expression?: string;
}

type AggregationsPerQuery = Record<string, AggregationView[]>;

/**
 * queryName → aggregations, recovered from the request payload: column display names depend on
 * the alias/expression the query was sent with (V1 parity).
 */
export function extractAggregationsPerQuery(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
): AggregationsPerQuery {
	const perQuery: AggregationsPerQuery = {};
	(requestPayload?.compositeQuery?.queries ?? []).forEach((envelope) => {
		if (
			envelope.type !==
			Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query
		) {
			return;
		}
		const spec = envelope.spec;
		if (spec?.name && spec.aggregations) {
			perQuery[spec.name] = spec.aggregations as AggregationView[];
		}
	});
	return perQuery;
}

/**
 * Names of the request's clickhouse_sql queries. These have no aggregation
 * metadata, but their value columns carry the user's real SQL alias in the
 * response `col.name` — so columns of these queries are named/keyed by that
 * alias rather than collapsing onto the query name. Builder/formula/promql use
 * placeholder names (`__result`/`__result_N`) and are excluded here.
 */
export function extractClickhouseQueryNames(
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined,
): Set<string> {
	const names = new Set<string>();
	(requestPayload?.compositeQuery?.queries ?? []).forEach((envelope) => {
		if (
			envelope.type !==
			Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType.clickhouse_sql
		) {
			return;
		}
		if (envelope.spec?.name) {
			names.add(envelope.spec.name);
		}
	});
	return names;
}

/**
 * Column display name (port of V1 `getColName`). Group columns keep their field name; aggregation
 * columns resolve alias > legend > expression > queryName, skipping legend on multi-aggregation
 * queries (one legend can't label several value columns).
 */
function getColName(
	col: Querybuildertypesv5ColumnDescriptorDTO,
	legendMap: Record<string, string>,
	aggregationsPerQuery: AggregationsPerQuery,
	clickhouseQueryNames: Set<string>,
): string {
	if (col.columnType === 'group') {
		return col.name;
	}

	const queryName = col.queryName ?? '';
	const aggregations = aggregationsPerQuery[queryName];
	const aggregation = aggregations?.[col.aggregationIndex ?? 0];
	const legend = legendMap[queryName];
	const alias = aggregation?.alias;
	const expression = aggregation?.expression || '';
	const aggregationsCount = aggregations?.length || 0;

	if (aggregationsCount > 0) {
		if (aggregationsCount === 1) {
			return alias || legend || expression || queryName;
		}
		return alias || expression || queryName;
	}

	// clickhouse_sql value columns carry their real SQL alias in col.name — use
	// it so each value column keeps its own header instead of collapsing onto
	// the query name. Formulas/promql use placeholder names, so they fall back
	// to legend || queryName.
	if (clickhouseQueryNames.has(queryName)) {
		return col.name;
	}
	return legend || queryName;
}

/**
 * The map key a value column's data is stored and looked up under in each row —
 * effectively the column id. Single-aggregation queries use the query name;
 * multi-aggregation queries append `.expression` (`queryName.expression`) so the
 * two value columns from one query don't collide on the same key.
 */
export function getAggregationColumnKey(
	queryName: string,
	aggregations: AggregationView[] | undefined,
	aggregationIndex = 0,
): string {
	const expression = aggregations?.[aggregationIndex]?.expression || '';
	if ((aggregations?.length || 0) > 1 && expression) {
		return `${queryName}.${expression}`;
	}
	return queryName;
}

/**
 * Stable row-data key (port of V1 `getColId`).
 */
function getColId(
	col: Querybuildertypesv5ColumnDescriptorDTO,
	aggregationsPerQuery: AggregationsPerQuery,
	clickhouseQueryNames: Set<string>,
): string {
	if (col.columnType === 'group') {
		return col.name;
	}

	const queryName = col.queryName ?? '';

	// clickhouse_sql value columns are keyed by their real SQL alias so multiple
	// value columns stay unique instead of all collapsing onto the query name
	// (which would overwrite every cell in the row with the last column's value).
	if (clickhouseQueryNames.has(queryName)) {
		return col.name;
	}

	return getAggregationColumnKey(
		queryName,
		aggregationsPerQuery[queryName],
		col.aggregationIndex ?? 0,
	);
}

export interface PrepareScalarTablesArgs {
	results: Querybuildertypesv5ScalarDataDTO[];
	legendMap: Record<string, string>;
	requestPayload: Querybuildertypesv5QueryRangeRequestDTO | undefined;
}

/**
 * Converts V5 scalar results into the keyed table shape Number/Pie/Table panels render: columns
 * with resolved display names + `isValueColumn`, rows keyed by column id (port of V1
 * `convertScalarDataArrayToTable`).
 */
export function prepareScalarTables({
	results,
	legendMap,
	requestPayload,
}: PrepareScalarTablesArgs): PanelTable[] {
	const aggregationsPerQuery = extractAggregationsPerQuery(requestPayload);
	const clickhouseQueryNames = extractClickhouseQueryNames(requestPayload);

	return results.map((scalarData) => {
		if (!scalarData) {
			return {
				queryName: '',
				legend: '',
				columns: [],
				rows: [],
			};
		}
		const queryName = scalarData.columns?.[0]?.queryName ?? '';

		const columns: PanelTableColumn[] = (scalarData.columns ?? []).map((col) => ({
			name: getColName(col, legendMap, aggregationsPerQuery, clickhouseQueryNames),
			queryName: col.queryName ?? '',
			isValueColumn: col.columnType === 'aggregation',
			id: getColId(col, aggregationsPerQuery, clickhouseQueryNames),
		}));

		const rows = (scalarData.data ?? []).map((dataRow) => {
			const rowData: Record<string, unknown> = {};
			columns.forEach((col, colIndex) => {
				rowData[col.id || col.name] = dataRow[colIndex];
			});
			return { data: rowData };
		});

		return {
			queryName,
			legend: legendMap[queryName] || '',
			columns,
			rows,
		};
	});
}
