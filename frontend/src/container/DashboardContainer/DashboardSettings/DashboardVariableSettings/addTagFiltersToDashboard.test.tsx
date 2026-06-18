import { PANEL_TYPES } from 'constants/queryBuilder';
import { Dashboard } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { removeVariableReferencesFromDashboard } from './addTagFiltersToDashboard';

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

const EMPTY_BUILDER = {
	queryData: [] as any,
	queryFormulas: [],
	queryTraceOperator: [],
};

const BASE_WIDGET = {
	opacity: '1',
	nullZeroValues: 'null',
	timePreferance: 'GLOBAL_TIME' as const,
	softMin: null,
	softMax: null,
	selectedLogFields: null,
	selectedTracesFields: null,
};

const DEFAULT_QUERY_DATA = {
	queryName: 'q1',
	// In QB v5, expression holds the query label (A/B/C), not a filter expression
	expression: 'A',
	dataSource: DataSource.METRICS,
	functions: [],
	groupBy: [],
	filters: { items: [] as any[], op: 'AND' as const },
	legend: '',
	disabled: false,
	having: [],
	limit: null,
	stepInterval: null,
	orderBy: [],
	selectColumns: [],
	source: '' as const,
};

/**
 * Build a dashboard with a single builder widget.
 * Only supply the fields your test actually cares about.
 */
const buildBuilderDashboard = (
	filterExpression: string,
	queryDataOverrides: Record<string, any> = {},
): Dashboard => ({
	id: 'dash1',
	createdAt: '',
	updatedAt: '',
	createdBy: '',
	updatedBy: '',
	data: {
		title: 'Test Dashboard',
		widgets: [
			{
				...BASE_WIDGET,
				id: 'widget-1',
				panelTypes: PANEL_TYPES.TIME_SERIES,
				title: 'Widget 1',
				description: '',
				query: {
					id: 'query1',
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					clickhouse_sql: [],
					builder: {
						queryData: [
							{
								...DEFAULT_QUERY_DATA,
								...queryDataOverrides,
								filter: { expression: filterExpression },
							},
						],
						queryFormulas: [],
						queryTraceOperator: [],
					},
					unit: '',
				},
			},
		],
		variables: {},
	},
});

const buildClickhouseDashboard = (query: string): Dashboard => ({
	id: 'dash-ch',
	createdAt: '',
	updatedAt: '',
	createdBy: '',
	updatedBy: '',
	data: {
		title: 'CH',
		widgets: [
			{
				...BASE_WIDGET,
				id: 'w1',
				panelTypes: PANEL_TYPES.TIME_SERIES,
				title: '',
				description: '',
				query: {
					id: 'q1',
					queryType: EQueryType.CLICKHOUSE,
					promql: [],
					clickhouse_sql: [{ name: 'A', query, legend: '', disabled: false }],
					builder: EMPTY_BUILDER,
					unit: '',
				},
			},
		],
		variables: {},
	},
});

const buildPromqlDashboard = (query: string): Dashboard => ({
	id: 'dash-prom',
	createdAt: '',
	updatedAt: '',
	createdBy: '',
	updatedBy: '',
	data: {
		title: 'PromQL Dashboard',
		widgets: [
			{
				...BASE_WIDGET,
				id: 'widget-prom',
				panelTypes: PANEL_TYPES.TIME_SERIES,
				title: 'PromQL Widget',
				description: '',
				query: {
					id: 'query-prom',
					queryType: EQueryType.PROM,
					promql: [{ name: 'A', query, legend: '', disabled: false }],
					clickhouse_sql: [],
					builder: EMPTY_BUILDER,
					unit: '',
				},
			},
		],
		variables: {},
	},
});

/** Run removeVariableReferencesFromDashboard on a single-widget clickhouse dashboard and return the cleaned SQL. */
const chQuery = (sql: string, varName: string): string => {
	const result = removeVariableReferencesFromDashboard(
		buildClickhouseDashboard(sql),
		varName,
	);
	return (result!.data.widgets![0] as any).query.clickhouse_sql[0].query;
};

/** Extract the first builder queryData from a cleaned dashboard. */
const firstBuilderQueryData = (dashboard: Dashboard | undefined): any =>
	(dashboard!.data.widgets![0] as any).query.builder.queryData[0];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('removeVariableReferencesFromDashboard', () => {
	describe('builder filter expression cleanup', () => {
		it('removes a variable clause from filter.expression', () => {
			const dashboard = buildBuilderDashboard(
				"service.name IN $service AND env = 'prod'",
			);

			const result = removeVariableReferencesFromDashboard(dashboard, 'service');

			expect(firstBuilderQueryData(result).filter.expression).toBe("env = 'prod'");
		});

		it('leaves no dangling AND/OR after removing a variable clause', () => {
			const dashboard = buildBuilderDashboard(
				"service.name IN $service AND env = 'prod'",
			);

			const result = removeVariableReferencesFromDashboard(dashboard, 'service');
			const { expression } = firstBuilderQueryData(result).filter;

			expect(expression).toBe("env = 'prod'");
			expect(expression).not.toMatch(/^\s*(AND|OR)/i);
			expect(expression).not.toMatch(/(AND|OR)\s*$/i);
		});

		it('does not remove $environment clause when deleting $env', () => {
			const dashboard = buildBuilderDashboard(
				'env = $env AND deployment.environment = $environment',
			);

			const result = removeVariableReferencesFromDashboard(dashboard, 'env');

			expect(firstBuilderQueryData(result).filter.expression).toBe(
				'deployment.environment = $environment',
			);
		});

		it('leaves literal filter expressions untouched when removing a variable', () => {
			const dashboard = buildBuilderDashboard(
				"service.name = 'api-gateway' AND env = 'prod'",
			);

			const result = removeVariableReferencesFromDashboard(dashboard, 'service');

			expect(firstBuilderQueryData(result).filter.expression).toBe(
				"service.name = 'api-gateway' AND env = 'prod'",
			);
		});

		it('removes only the variable clause, preserving a literal clause on the same key', () => {
			const dashboard = buildBuilderDashboard(
				"service.name IN $service AND service.name = 'api-gateway'",
			);

			const result = removeVariableReferencesFromDashboard(dashboard, 'service');

			expect(firstBuilderQueryData(result).filter.expression).toBe(
				"service.name = 'api-gateway'",
			);
		});

		it('returns filter.expression unchanged when the variable has no clauses in it', () => {
			const dashboard = buildBuilderDashboard("env = 'prod'");

			const result = removeVariableReferencesFromDashboard(dashboard, 'service');

			expect(firstBuilderQueryData(result).filter.expression).toBe("env = 'prod'");
		});
	});

	describe('PromQL query cleanup', () => {
		it('removes variable placeholder from a promql query', () => {
			const result = removeVariableReferencesFromDashboard(
				buildPromqlDashboard('sum(rate(http_requests_total{$service}[5m]))'),
				'service',
			);

			const widget = result!.data.widgets![0] as any;
			expect(widget.query.promql[0].query).toBe(
				'sum(rate(http_requests_total{}[5m]))',
			);
		});

		it('strips only the variable token inside a PromQL label matcher (token-only path)', () => {
			const result = removeVariableReferencesFromDashboard(
				buildPromqlDashboard('up{env="$env", job="api"}'),
				'env',
			);

			const widget = result!.data.widgets![0] as any;
			expect(widget.query.promql[0].query).toBe('up{env="", job="api"}');
		});
	});

	describe('ClickHouse SQL query cleanup', () => {
		it('removes a quoted variable clause and its WHERE keyword', () => {
			expect(
				chQuery(
					"SELECT count() FROM signoz_logs WHERE service_name = '$service'",
					'service',
				),
			).toBe('SELECT count() FROM signoz_logs');
		});

		it('removes a middle clause: AND env={{.env}} AND', () => {
			expect(
				chQuery('SELECT count() FROM t WHERE a=1 AND env={{.env}} AND b=2', 'env'),
			).toBe('SELECT count() FROM t WHERE a=1 AND b=2');
		});

		it('removes the first clause: env={{.env}} AND rest', () => {
			expect(
				chQuery('SELECT count() FROM t WHERE env={{.env}} AND b=2', 'env'),
			).toBe('SELECT count() FROM t WHERE b=2');
		});

		it('removes the last clause: rest AND env=$env', () => {
			expect(chQuery('SELECT count() FROM t WHERE a=1 AND env=$env', 'env')).toBe(
				'SELECT count() FROM t WHERE a=1',
			);
		});

		it('removes a clause with double-bracket syntax: service=[[svc]]', () => {
			expect(chQuery('SELECT count() FROM t WHERE service=[[svc]]', 'svc')).toBe(
				'SELECT count() FROM t',
			);
		});

		it('falls back to token-only strip for a bare variable in SELECT', () => {
			expect(chQuery('SELECT $metric FROM table', 'metric')).toBe(
				'SELECT FROM table',
			);
		});
	});

	describe('edge cases', () => {
		it('is idempotent — calling twice produces the same result', () => {
			const dashboard = buildBuilderDashboard(
				"service.name IN $service AND env = 'prod'",
			);

			const once = removeVariableReferencesFromDashboard(dashboard, 'service');
			const twice = removeVariableReferencesFromDashboard(once, 'service');

			expect(twice).toStrictEqual(once);
		});

		it('handles a dashboard with no widgets without throwing', () => {
			const dashboard: Dashboard = {
				id: 'dash-empty',
				createdAt: '',
				updatedAt: '',
				createdBy: '',
				updatedBy: '',
				data: { title: 'Empty Dashboard', widgets: undefined, variables: {} },
			};

			expect(() =>
				removeVariableReferencesFromDashboard(dashboard, 'service'),
			).not.toThrow();
		});
	});
});
