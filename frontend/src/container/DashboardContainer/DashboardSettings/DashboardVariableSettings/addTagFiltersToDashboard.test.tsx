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

	it('removes dynamic variable filters and placeholders from builder query data', () => {
		const dashboard = buildDashboard();

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
			'service.name',
		);

		expect(cleanedDashboard?.data.widgets?.[0]).toBeDefined();
		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		expect(queryData.filters.items).toHaveLength(0);
		expect(queryData.filter.expression).toBe("env = 'prod'");
		expect(queryData.expression).toBe("env = 'prod'");
		expect(queryData.legend).toBe('requests');
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
		expect(widget.query.promql[0].legend).toBe('requests');
	});

	it('removes variable placeholders from filter item values for non-dynamic variables', () => {
		const dashboard = buildDashboard();

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		expect(queryData.filters.items).toHaveLength(0);
		expect(queryData.legend).toBe('requests');
		// The whole key-value clause is removed — no dangling AND/IN/operator
		expect(queryData.filter.expression).toBe("env = 'prod'");
		expect(queryData.filter.expression).not.toMatch(/^\s*(AND|OR)/i);
		expect(queryData.filter.expression).not.toMatch(/(AND|OR)\s*$/i);
		// expression field must also be cleaned via ANTLR, not just filter.expression
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
		expect(queryData.filters.items).toHaveLength(1);
		expect(queryData.legend).toBe('api-gateway requests');
	});

	it('removes variable placeholders from formula expression and legend', () => {
		const dashboard: Dashboard = {
			id: 'dash3',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Formula Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-3',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Formula Widget',
						description: '',
						query: {
							id: 'query4',
							queryType: EQueryType.QUERY_BUILDER,
							promql: [],
							clickhouse_sql: [],
							builder: {
								queryData: [] as any,
								queryFormulas: [
									{
										queryName: 'f1',
										expression: 'A / $service_count',
										legend: '$service_count ratio',
										disabled: false,
										having: [],
									},
								],
								queryTraceOperator: [],
							},
							unit: '',
						},
					},
				],
				variables: {},
			},
		};

		const cleanedDashboard = removeVariableReferencesFromDashboard(
			dashboard,
			'service_count',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const formula = widget.query.builder.queryFormulas[0];
		expect(formula.expression).toBe('A /');
		expect(formula.legend).toBe('ratio');
	});

	it('removes variable placeholders from queryTraceOperator queries', () => {
		const dashboard: Dashboard = {
			id: 'dash4',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Trace Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-4',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Trace Widget',
						description: '',
						query: {
							id: 'query5',
							queryType: EQueryType.QUERY_BUILDER,
							promql: [],
							clickhouse_sql: [],
							builder: {
								queryData: [] as any,
								queryFormulas: [],
								queryTraceOperator: [
									{
										queryName: 'qt1',
										dataSource: DataSource.TRACES,
										functions: [],
										groupBy: [],
										expression: 'service.name IN $service',
										filter: {
											expression: 'service.name IN $service',
										},
										filters: {
											items: [
												{
													id: 'f1',
													key: { id: 'service.name', key: 'service.name', type: '' },
													op: 'IN',
													value: '$service',
												},
											],
											op: 'AND',
										},
										legend: '$service trace count',
										disabled: false,
										having: [],
										limit: null,
										stepInterval: null,
										orderBy: [],
										selectColumns: [],
										source: '',
									},
								],
							},
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
		const traceQuery = widget.query.builder.queryTraceOperator[0];
		expect(traceQuery.filters.items).toHaveLength(0);
		expect(traceQuery.legend).toBe('trace count');
	});

	it('does not corrupt a longer variable whose name starts with the deleted variable name', () => {
		const dashboard: Dashboard = {
			id: 'dash-boundary',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Boundary Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-boundary',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Traffic for $env and $environment',
						description: '$env_tag $env',
						query: {
							id: 'query-boundary',
							queryType: EQueryType.QUERY_BUILDER,
							promql: [],
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
			'env',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		// $env removed, but $environment and $env_tag must not be touched
		expect(widget.title).toBe('Traffic for and $environment');
		expect(widget.description).toBe('$env_tag');
	});

	it('removes variable placeholders from widget title and description', () => {
		const dashboard: Dashboard = {
			id: 'dash5',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Widget Meta Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-5',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Traffic for $service',
						description: 'Metrics scoped to $service environment',
						query: {
							id: 'query6',
							queryType: EQueryType.QUERY_BUILDER,
							promql: [],
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
		expect(widget.title).toBe('Traffic for');
		expect(widget.description).toBe('Metrics scoped to environment');
	});

	it('removes only the matching variable clause when two variables share the same filter key', () => {
		// Two variables both backed by deployment.environment.
		// Deleting $env_region must preserve $env, not remove the first $-valued clause.
		const dashboard: Dashboard = {
			id: 'dash-shared-key',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Shared Key Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-shared',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Shared Key Widget',
						description: '',
						query: {
							id: 'query-shared',
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
											"deployment.environment = $env AND deployment.environment = $env_region AND status = 'ok'",
										filter: {
											expression:
												"deployment.environment = $env AND deployment.environment = $env_region AND status = 'ok'",
										},
										filters: {
											items: [
												{
													id: 'f1',
													key: {
														id: 'deployment.environment',
														key: 'deployment.environment',
														type: '',
													},
													op: '=',
													value: '$env',
												},
												{
													id: 'f2',
													key: {
														id: 'deployment.environment',
														key: 'deployment.environment',
														type: '',
													},
													op: '=',
													value: '$env_region',
												},
											],
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
			'env_region',
			'deployment.environment',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		// $env_region clause removed; $env clause must survive
		expect(queryData.filter.expression).toBe(
			"deployment.environment = $env AND status = 'ok'",
		);
		expect(queryData.expression).toBe(
			"deployment.environment = $env AND status = 'ok'",
		);
		// filter item for $env_region gone, $env item stays
		expect(queryData.filters.items).toHaveLength(1);
		expect(queryData.filters.items[0].value).toBe('$env');
	});

	it('does not remove $environment clause when deleting $env from filter expression', () => {
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
			'env',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		// env = $env removed; deployment.environment = $environment must be untouched
		expect(queryData.filter.expression).toBe(
			'deployment.environment = $environment',
		);
		expect(queryData.expression).toBe('deployment.environment = $environment');
	});

	it('keeps a literal clause for the same key when removing its variable clause', () => {
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
											items: [
												{
													id: 'f1',
													key: { id: 'service.name', key: 'service.name', type: '' },
													op: 'IN',
													value: '$service',
												},
												{
													id: 'f2',
													key: { id: 'service.name', key: 'service.name', type: '' },
													op: '=',
													value: 'api-gateway',
												},
											],
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
			'service.name',
		);

		const widget = cleanedDashboard!.data.widgets![0] as any;
		const queryData = widget.query.builder.queryData[0];

		// $service clause removed; literal 'api-gateway' clause must survive
		expect(queryData.filter.expression).toBe("service.name = 'api-gateway'");
		expect(queryData.filters.items).toHaveLength(1);
		expect(queryData.filters.items[0].value).toBe('api-gateway');
	});

	it('removes only the variable entry from a multi-value array filter item, keeping literals', () => {
		const dashboard: Dashboard = {
			id: 'dash-multivalue',
			createdAt: '',
			updatedAt: '',
			createdBy: '',
			updatedBy: '',
			data: {
				title: 'Multi-value Dashboard',
				widgets: [
					{
						...BASE_WIDGET,
						id: 'widget-multivalue',
						panelTypes: PANEL_TYPES.TIME_SERIES,
						title: 'Multi-value Widget',
						description: '',
						query: {
							id: 'query-multivalue',
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
										expression: '',
										filter: { expression: '' },
										filters: {
											items: [
												{
													id: 'f1',
													key: { id: 'service.name', key: 'service.name', type: '' },
													op: 'IN',
													value: ['$service', 'api-gateway'],
												},
											],
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

		// item is kept but $service is removed from the array; literal stays
		expect(queryData.filters.items).toHaveLength(1);
		expect(queryData.filters.items[0].value).toStrictEqual(['api-gateway']);
	});

	it('removes variable placeholders from clickhouse_sql query and legend', () => {
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
			"SELECT count() FROM signoz_logs WHERE service_name = ''",
		);
		expect(widget.query.clickhouse_sql[0].legend).toBe('log count');
	});

	it('is idempotent — calling twice produces the same result', () => {
		const dashboard = buildDashboard();

		const once = removeVariableReferencesFromDashboard(
			dashboard,
			'service',
			'service.name',
		);
		const twice = removeVariableReferencesFromDashboard(
			once,
			'service',
			'service.name',
		);

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
		expect(queryData.filters.items).toHaveLength(1);
		expect(queryData.legend).toBe('production');
	});
});
