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
});
