import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';

import {
	getReferencedVariables,
	queryReferencesAnyVariable,
} from '../getReferencedVariables';

// Test fixtures are cast at the outer boundary; the perses-generated query
// plugin unions are too verbose to construct field-typed inline.
function clickhouseQuery(query: string): DashboardtypesQueryDTO[] {
	return [
		{
			kind: 'ScalarQuery',
			spec: {
				plugin: {
					kind: 'signoz/CompositeQuery',
					spec: {
						queries: [{ type: 'clickhouse_sql', spec: { name: 'A', query } }],
					},
				},
			},
		},
	] as unknown as DashboardtypesQueryDTO[];
}

describe('getReferencedVariables', () => {
	it('returns only the variables the query references', () => {
		const queries = clickhouseQuery(
			'SELECT count() FROM t WHERE service = $service.name',
		);
		expect(
			getReferencedVariables(queries, [
				'service.name',
				'deployment.environment',
				'dyn_service',
			]),
		).toStrictEqual(['service.name']);
	});

	it('returns empty when no known name matches', () => {
		const queries = clickhouseQuery('SELECT 1');
		expect(getReferencedVariables(queries, ['service.name'])).toStrictEqual([]);
	});
});

describe('queryReferencesAnyVariable', () => {
	it('is true when the query references a variable, even with no known names', () => {
		const queries = clickhouseQuery(
			'SELECT count() FROM t WHERE service = $service.name',
		);
		expect(queryReferencesAnyVariable(queries)).toBe(true);
	});

	it('is false for a query with no variable reference', () => {
		expect(queryReferencesAnyVariable(clickhouseQuery('SELECT 1'))).toBe(false);
	});

	it('does not treat $__ macros as variable references', () => {
		expect(
			queryReferencesAnyVariable(
				clickhouseQuery('SELECT toStartOfInterval(ts, INTERVAL $__interval)'),
			),
		).toBe(false);
	});

	it('is false for an empty query list', () => {
		expect(queryReferencesAnyVariable([])).toBe(false);
	});
});
