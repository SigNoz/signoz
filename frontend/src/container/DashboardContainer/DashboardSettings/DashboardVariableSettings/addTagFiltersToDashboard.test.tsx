import { PANEL_TYPES } from 'constants/queryBuilder';
import { Dashboard } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { removeVariableReferencesFromDashboard } from './addTagFiltersToDashboard';

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

describe('removeVariableReferencesFromDashboard', () => {
	const buildDashboard = (): Dashboard => ({
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
									queryName: 'q1',
									dataSource: DataSource.METRICS,
									functions: [],
									groupBy: [],
									expression: "service.name IN $service AND env = 'prod'",
									filter: {
										expression: "service.name IN $service AND env = 'prod'",
									},
									filters: {
										items: [
											{
												id: 'filter-1',
												key: { id: 'service.name', key: 'service.name', type: '' },
												op: 'IN',
												value: '$service',
											},
										],
										op: 'AND',
									},
									legend: '$service requests',
									disabled: false,
									having: [],
									limit: null,
									stepInterval: null,
									orderBy: [],
									selectColumns: [],
									source: '',
								},
							],
							queryFormulas: [],
							queryTraceOperator: [],
						},
					},
				},
			],
			variables: {},
		},
	});

	it('removes variable clause from builder filter.expression and expression', () => {
		const dashboard = buildDashboard();

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
		);

		expect(cleanedDashboard?.data.widgets?.[0]).toBeDefined();
		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		expect(queryData.filter.expression).toBe("env = 'prod'");
		expect(queryData.expression).toBe("env = 'prod'");
	});

	it('removes variable placeholders from promql query text', () => {
		const dashboard: Dashboard = {
			id: 'dash2',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'PromQL Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-2',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'PromQL Widget',
						description: '',
						query: {
							id: 'query3',
							queryType: EQueryType.PROM,
							promql: [
								{
									name: 'prom1',
									query: 'sum(rate(http_requests_total{$service}[5m]))',
									legend: '$service requests',
									disabled: false,
								},
							],
							clickhouse_sql: [],
							builder: EMPTY_BUILDER,
							unit: '',
						},
					},
				],
				variables: {},
			},
		};

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		expect(widget.query.promql[0].query).toBe(
			'sum(rate(http_requests_total{}[5m]))',
		);
	});

	it('removes entire variable clause leaving no dangling AND/OR', () => {
		const dashboard = buildDashboard();

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		expect(queryData.filter.expression).toBe("env = 'prod'");
		expect(queryData.filter.expression).not.toMatch(/^\s*(AND|OR)/i);
		expect(queryData.filter.expression).not.toMatch(/(AND|OR)\s*$/i);
		expect(queryData.expression).toBe("env = 'prod'");
	});

	it('leaves literal filter expressions untouched when removing a variable', () => {
		const dashboard: Dashboard = {
			id: 'dash-literal',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Literal Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-lit',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Widget',
						description: '',
						query: {
							id: 'query-lit',
							queryType: EQueryType.QUERY_BUILDER,
							promql: [],
							clickhouse_sql: [],
							builder: {
								queryData: [
									{
										queryName: 'q1',
										dataSource: DataSource.METRICS,
										functions: [],
										groupBy: [],
										expression: "service.name = 'api-gateway'",
										filter: {
											expression: "service.name = 'api-gateway' AND env = 'prod'",
										},
										filters: {
											items: [
												{
													id: 'f1',
													key: { id: 'service.name', key: 'service.name', type: '' },
													op: '=',
													value: 'api-gateway',
												},
											],
											op: 'AND',
										},
										legend: 'api-gateway requests',
										disabled: false,
										having: [],
										limit: null,
										stepInterval: null,
										orderBy: [],
										selectColumns: [],
										source: '',
									},
								],
								queryFormulas: [],
								queryTraceOperator: [],
							},
						},
					},
				],
				variables: {},
			},
		};

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		expect(queryData.filter.expression).toBe(
			"service.name = 'api-gateway' AND env = 'prod'",
		);
	});

	it('does not remove $environment clause when deleting $env', () => {
		const dashboard: Dashboard = {
			id: 'dash-boundary-expr',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Boundary Expression Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-boundary-expr',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Widget',
						description: '',
						query: {
							id: 'query-boundary-expr',
							queryType: EQueryType.QUERY_BUILDER,
							promql: [],
							clickhouse_sql: [],
							builder: {
								queryData: [
									{
										queryName: 'q1',
										dataSource: DataSource.METRICS,
										functions: [],
										groupBy: [],
										expression: 'env = $env AND deployment.environment = $environment',
										filter: {
											expression: 'env = $env AND deployment.environment = $environment',
										},
										filters: {
											items: [],
											op: 'AND',
										},
										legend: '',
										disabled: false,
										having: [],
										limit: null,
										stepInterval: null,
										orderBy: [],
										selectColumns: [],
										source: '',
									},
								],
								queryFormulas: [],
								queryTraceOperator: [],
							},
						},
					},
				],
				variables: {},
			},
		};

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'env',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		expect(queryData.filter.expression).toBe(
			'deployment.environment = $environment',
		);
		expect(queryData.expression).toBe('deployment.environment = $environment');
	});

	it('removes only the matching variable clause, preserving a literal clause on the same key', () => {
		const dashboard: Dashboard = {
			id: 'dash-mixed',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Mixed Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-mixed',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Mixed Widget',
						description: '',
						query: {
							id: 'query-mixed',
							queryType: EQueryType.QUERY_BUILDER,
							promql: [],
							clickhouse_sql: [],
							builder: {
								queryData: [
									{
										queryName: 'q1',
										dataSource: DataSource.METRICS,
										functions: [],
										groupBy: [],
										expression:
											"service.name IN $service AND service.name = 'api-gateway'",
										filter: {
											expression:
												"service.name IN $service AND service.name = 'api-gateway'",
										},
										filters: {
											items: [],
											op: 'AND',
										},
										legend: '',
										disabled: false,
										having: [],
										limit: null,
										stepInterval: null,
										orderBy: [],
										selectColumns: [],
										source: '',
									},
								],
								queryFormulas: [],
								queryTraceOperator: [],
							},
						},
					},
				],
				variables: {},
			},
		};

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		expect(queryData.filter.expression).toBe("service.name = 'api-gateway'");
	});

	it('removes variable placeholders from clickhouse_sql query text', () => {
		const dashboard: Dashboard = {
			id: 'dash-clickhouse',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'ClickHouse Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-clickhouse',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'ClickHouse Widget',
						description: '',
						query: {
							id: 'query-clickhouse',
							queryType: EQueryType.CLICKHOUSE,
							promql: [],
							clickhouse_sql: [
								{
									name: 'ch1',
									query:
										"SELECT count() FROM signoz_logs WHERE service_name = '$service'",
									legend: '$service log count',
									disabled: false,
								},
							],
							builder: EMPTY_BUILDER,
							unit: '',
						},
					},
				],
				variables: {},
			},
		};

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		expect(widget.query.clickhouse_sql[0].query).toBe(
			'SELECT count() FROM signoz_logs',
		);
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

	const chQuery = (sql: string, varName: string): string => {
		const result = removeVariableReferencesFromDashboard(
			buildClickhouseDashboard(sql),
			varName,
		);
		return (result!.data.widgets![0] as any).query.clickhouse_sql[0].query;
	};

	it('removes unquoted middle clause: AND env={{.env}} AND', () => {
		expect(
			chQuery('SELECT count() FROM t WHERE a=1 AND env={{.env}} AND b=2', 'env'),
		).toBe('SELECT count() FROM t WHERE a=1 AND b=2');
	});

	it('removes unquoted first clause: env={{.env}} AND rest', () => {
		expect(
			chQuery('SELECT count() FROM t WHERE env={{.env}} AND b=2', 'env'),
		).toBe('SELECT count() FROM t WHERE b=2');
	});

	it('removes unquoted last clause: rest AND env=$env', () => {
		expect(chQuery('SELECT count() FROM t WHERE a=1 AND env=$env', 'env')).toBe(
			'SELECT count() FROM t WHERE a=1',
		);
	});

	it('removes only clause with bracket syntax: service=[[svc]]', () => {
		expect(chQuery('SELECT count() FROM t WHERE service=[[svc]]', 'svc')).toBe(
			'SELECT count() FROM t',
		);
	});

	it('falls back to token-only strip for bare variable in SELECT', () => {
		expect(chQuery('SELECT $metric FROM table', 'metric')).toBe(
			'SELECT FROM table',
		);
	});

	it('does not affect PromQL label matchers (token-only path)', () => {
		const dash: Dashboard = {
			id: 'd',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'P',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'w',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: '',
						description: '',
						query: {
							id: 'q',
							queryType: EQueryType.PROM,
							promql: [
								{
									name: 'A',
									query: 'up{env="$env", job="api"}',
									legend: '',
									disabled: false,
								},
							],
							clickhouse_sql: [],
							builder: EMPTY_BUILDER,
							unit: '',
						},
					},
				],
				variables: {},
			},
		};
		const result = removeVariableReferencesFromDashboard(dash, 'env');
		const widget = result!.data.widgets![0] as any;
		expect(widget.query.promql[0].query).toBe('up{env="", job="api"}');
	});

	it('is idempotent — calling twice produces the same result', () => {
		const dashboard = buildDashboard();

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
			data: {
				title: 'Empty Dashboard',
				widgets: undefined,
				variables: {},
			},
		};

		expect(() =>
			removeVariableReferencesFromDashboard(dashboard, 'service'),
		).not.toThrow();
	});

	it('returns expression unchanged when the variable has no clauses in it', () => {
		const dashboard: Dashboard = {
			id: 'dash-unrelated',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Unrelated Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-unrelated',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Unrelated Widget',
						description: '',
						query: {
							id: 'query-unrelated',
							queryType: EQueryType.QUERY_BUILDER,
							promql: [],
							clickhouse_sql: [],
							builder: {
								queryData: [
									{
										queryName: 'q1',
										dataSource: DataSource.METRICS,
										functions: [],
										groupBy: [],
										expression: "env = 'prod'",
										filter: { expression: "env = 'prod'" },
										filters: {
											items: [
												{
													id: 'f1',
													key: { id: 'env', key: 'env', type: '' },
													op: '=',
													value: 'prod',
												},
											],
											op: 'AND',
										},
										legend: 'production',
										disabled: false,
										having: [],
										limit: null,
										stepInterval: null,
										orderBy: [],
										selectColumns: [],
										source: '',
									},
								],
								queryFormulas: [],
								queryTraceOperator: [],
							},
						},
					},
				],
				variables: {},
			},
		};

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		expect(queryData.filter.expression).toBe("env = 'prod'");
	});
});
