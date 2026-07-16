import { escapeRegExp, isArray } from 'lodash-es';
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
 * Matches *any* variable reference in a recognized syntax without knowing the
 * name: `{{name}}`, `{{.name}}`, `[[name]]`, or `$name`. The `$` form excludes
 * `$__…` macros and positional `$1` so built-ins don't read as variables.
 */
const ANY_VARIABLE_REFERENCE =
	/\{\{\s*\.?[\w.]+\s*\}\}|\[\[\s*[\w.]+\s*\]\]|\$(?!__)[a-zA-Z_][\w.]*/;

/**
 * Use when the set of variable names isn't known yet (e.g. before the fetch
 * context initializes), so a name-based {@link textContainsVariableReference}
 * check can't run.
 */
export function containsAnyVariableReference(text: string): boolean {
	return !!text && ANY_VARIABLE_REFERENCE.test(text);
}

function extractQueryBuilderTexts(query: Query): string[] {
	const texts: string[] = [];
	const queryDataList = query.builder?.queryData;
	if (isArray(queryDataList)) {
		queryDataList.forEach((queryData) => {
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
 * Text-based detection only. Structural checks (like filter.key.key matching a
 * variable attribute) are NOT included.
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

/**
 * Rewrites every reference to `oldName` in `text` to `newName`, preserving the
 * surrounding syntax for each recognized form ({{.x}}, {{x}}, $x, [[x]]). Used
 * when a variable is renamed so its usages across queries stay valid.
 */
export function rewriteVariableReferences(
	text: string,
	oldName: string,
	newName: string,
): string {
	if (!text || !oldName || oldName === newName) {
		return text;
	}
	const name = escapeRegExp(oldName);
	return text
		.replace(
			new RegExp(`(\\{\\{\\s*?\\.)${name}(\\s*?\\}\\})`, 'g'),
			`$1${newName}$2`,
		)
		.replace(new RegExp(`(\\{\\{\\s*)${name}(\\s*\\}\\})`, 'g'), `$1${newName}$2`)
		.replace(new RegExp(`\\$${name}\\b`, 'g'), `$${newName}`)
		.replace(
			new RegExp(`(\\[\\[\\s*)${name}(\\s*\\]\\])`, 'g'),
			`$1${newName}$2`,
		);
}
