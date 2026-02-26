import { isArray } from 'lodash-es';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

/**
 * Builds a RegExp that matches any recognized variable reference syntax:
 *   {{.variableName}}  — dot prefix, optional whitespace
 *   {{variableName}}   — no dot, optional whitespace
 *   $variableName      — dollar prefix, word-boundary terminated
 *   [[variableName]]   — square brackets, optional whitespace
 */
export function buildVariableReferencePattern(variableName: string): RegExp {
	const patterns = [
		`\\{\\{\\s*?\\.${variableName}\\s*?\\}\\}`,
		`\\{\\{\\s*${variableName}\\s*\\}\\}`,
		`\\$${variableName}\\b`,
		`\\[\\[\\s*${variableName}\\s*\\]\\]`,
	];
	return new RegExp(patterns.join('|'));
}

/**
 * Returns true if `text` contains a reference to `variableName` in any of the
 * recognized variable syntaxes.
 */
export function textContainsVariableReference(
	text: string,
	variableName: string,
): boolean {
	if (!text || !variableName) {
		return false;
	}
	return buildVariableReferencePattern(variableName).test(text);
}

/**
 * Extracts all text strings from a widget Query that could contain variable
 * references. Covers:
 * - QUERY_BUILDER: filter items' string values + filter.expression
 * - PROM: each promql[].query
 * - CLICKHOUSE: each clickhouse_sql[].query
 */
function extractQueryBuilderTexts(query: Query): string[] {
	const texts: string[] = [];
	const queryDataList = query.builder?.queryData;
	if (isArray(queryDataList)) {
		queryDataList.forEach((queryData) => {
			// Collect string values from filter items
			queryData.filters?.items?.forEach((filter: TagFilterItem) => {
				if (isArray(filter.value)) {
					filter.value.forEach((v) => {
						if (typeof v === 'string') {
							texts.push(v);
						}
					});
				} else if (typeof filter.value === 'string') {
					texts.push(filter.value);
				}
			});

			// Collect filter expression
			if (queryData.filter?.expression) {
				texts.push(queryData.filter.expression);
			}
		});
	}
	return texts;
}

function extractPromQLTexts(query: Query): string[] {
	const texts: string[] = [];
	if (isArray(query.promql)) {
		query.promql.forEach((promqlQuery) => {
			if (promqlQuery.query) {
				texts.push(promqlQuery.query);
			}
		});
	}
	return texts;
}

function extractClickhouseSQLTexts(query: Query): string[] {
	const texts: string[] = [];
	if (isArray(query.clickhouse_sql)) {
		query.clickhouse_sql.forEach((clickhouseQuery) => {
			if (clickhouseQuery.query) {
				texts.push(clickhouseQuery.query);
			}
		});
	}
	return texts;
}

/**
 * Extracts all text strings from a widget Query that could contain variable
 * references. Covers:
 * - QUERY_BUILDER: filter items' string values + filter.expression
 * - PROM: each promql[].query
 * - CLICKHOUSE: each clickhouse_sql[].query
 */
export function extractQueryTextStrings(query: Query): string[] {
	if (query.queryType === EQueryType.QUERY_BUILDER) {
		return extractQueryBuilderTexts(query);
	}

	if (query.queryType === EQueryType.PROM) {
		return extractPromQLTexts(query);
	}

	if (query.queryType === EQueryType.CLICKHOUSE) {
		return extractClickhouseSQLTexts(query);
	}

	return [];
}

/**
 * Given a widget Query and an array of variable names, returns the subset of
 * variable names that are referenced in the query text.
 *
 * This performs text-based detection only. Structural checks (like
 * filter.key.key matching a variable attribute) are NOT included.
 */
export function getVariableReferencesInQuery(
	query: Query,
	variableNames: string[],
): string[] {
	const texts = extractQueryTextStrings(query);
	if (texts.length === 0) {
		return [];
	}

	return variableNames.filter((name) =>
		texts.some((text) => textContainsVariableReference(text, name)),
	);
}
