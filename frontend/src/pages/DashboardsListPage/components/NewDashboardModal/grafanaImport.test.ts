import {
	convertGrafanaDashboard,
	grafanaToPostable,
	isGrafanaDashboard,
} from './grafanaImport';

const GRAFANA_FIXTURE = {
	title: 'Node Exporter',
	description: 'Sample Grafana dashboard',
	schemaVersion: 38,
	tags: ['node', 'prometheus'],
	panels: [
		{
			id: 1,
			type: 'timeseries',
			title: 'CPU usage',
			description: 'CPU over time',
			gridPos: { x: 0, y: 0, w: 12, h: 8 },
			targets: [
				{
					expr: 'sum(rate(node_cpu_seconds_total[5m]))',
					legendFormat: 'cpu',
					refId: 'A',
				},
				{ expr: '', refId: 'B' },
			],
		},
		{
			id: 2,
			type: 'stat',
			title: 'Uptime',
			gridPos: { x: 12, y: 0, w: 12, h: 8 },
			targets: [{ expr: 'time() - node_boot_time_seconds', refId: 'A' }],
		},
		{
			id: 3,
			type: 'row',
			title: 'Details',
			collapsed: true,
			panels: [
				{
					id: 4,
					type: 'table',
					title: 'Top processes',
					gridPos: { x: 0, y: 8, w: 24, h: 6 },
					targets: [{ expr: 'topk(5, process_cpu_seconds_total)', refId: 'A' }],
				},
			],
		},
		{
			id: 5,
			type: 'fancy-unknown-panel',
			title: 'Mystery',
			gridPos: { x: 0, y: 14, w: 6, h: 6 },
			targets: [{ expr: 'up', refId: 'A' }],
		},
	],
	templating: {
		list: [
			{
				name: 'instance',
				label: 'Instance',
				type: 'query',
				query: 'label_values(node_cpu_seconds_total, instance)',
			},
			{
				name: 'env',
				label: 'Env',
				type: 'custom',
				options: [
					{ value: 'prod', selected: true },
					{ value: 'staging', selected: false },
				],
				current: { value: 'prod' },
			},
			{
				name: 'threshold',
				label: 'Threshold',
				type: 'textbox',
				current: { value: '80' },
			},
			{ name: 'ds', type: 'datasource' },
		],
	},
};

describe('isGrafanaDashboard', () => {
	it('detects a Grafana export via panels array + numeric schemaVersion', () => {
		expect(
			isGrafanaDashboard(GRAFANA_FIXTURE as unknown as Record<string, unknown>),
		).toBe(true);
	});

	it('detects a provisioned Grafana dashboard via __inputs', () => {
		expect(
			isGrafanaDashboard({
				panels: [],
				__inputs: { DS_PROMETHEUS: { type: 'datasource' } },
			}),
		).toBe(true);
	});

	it('rejects SigNoz v2 dashboards with a spec object', () => {
		expect(isGrafanaDashboard({ spec: {}, panels: [] })).toBe(false);
	});

	it('rejects legacy SigNoz v1 dashboards', () => {
		expect(isGrafanaDashboard({ version: 'v1', widgets: [] })).toBe(false);
	});

	it('rejects payloads without a panels array', () => {
		expect(isGrafanaDashboard({ title: 'nope' })).toBe(false);
	});
});

describe('convertGrafanaDashboard', () => {
	const { spec, panels, warnings } = convertGrafanaDashboard(
		GRAFANA_FIXTURE as unknown as Record<string, unknown>,
	);

	it('maps the dashboard title and description', () => {
		expect(spec.display.name).toBe('Node Exporter');
		expect(spec.display.description).toBe('Sample Grafana dashboard');
	});

	it('flattens collapsed rows and converts every real panel', () => {
		// row panel itself is skipped, its nested table panel is hoisted
		expect(Object.keys(panels)).toHaveLength(4);
		expect(panels['grafana-panel-1']).toBeDefined();
		expect(panels['grafana-panel-4']).toBeDefined();
		expect(panels['grafana-panel-3']).toBeUndefined();
	});

	it('maps Grafana panel types to SigNoz plugin kinds', () => {
		expect(panels['grafana-panel-1'].spec.plugin.kind).toBe(
			'signoz/TimeSeriesPanel',
		);
		expect(panels['grafana-panel-2'].spec.plugin.kind).toBe(
			'signoz/NumberPanel',
		);
		expect(panels['grafana-panel-4'].spec.plugin.kind).toBe(
			'signoz/TablePanel',
		);
	});

	it('falls back to TimeSeriesPanel for unknown panel types with a warning', () => {
		expect(panels['grafana-panel-5'].spec.plugin.kind).toBe(
			'signoz/TimeSeriesPanel',
		);
		expect(
			warnings.some((warning) => warning.includes('fancy-unknown-panel')),
		).toBe(true);
	});

	it('passes PromQL through natively and skips empty targets', () => {
		const queries = panels['grafana-panel-1'].spec.queries;
		expect(queries).toHaveLength(1);
		expect(queries[0].kind).toBe('time_series');
		const plugin = queries[0].spec.plugin;
		expect(plugin.kind).toBe('signoz/PromQLQuery');
		if (plugin.kind === 'signoz/PromQLQuery') {
			expect(plugin.spec.query).toBe(
				'sum(rate(node_cpu_seconds_total[5m]))',
			);
			expect(plugin.spec.legend).toBe('cpu');
		}
		expect(
			warnings.some((warning) => warning.includes('skipped 1 query')),
		).toBe(true);
	});

	it('uses scalar request type for stat panels', () => {
		expect(panels['grafana-panel-2'].spec.queries[0].kind).toBe('scalar');
	});

	it('uses raw request type for table panels', () => {
		expect(panels['grafana-panel-4'].spec.queries[0].kind).toBe('raw');
	});

	it('converts the 24-column Grafana grid to the 12-column Perses grid', () => {
		const items = spec.layouts[0].spec.items ?? [];
		expect(items).toHaveLength(4);
		const cpuItem = items.find(
			(item) =>
				(item.content as { $ref?: string } | undefined)?.$ref ===
				'#/spec/panels/grafana-panel-1',
		);
		expect(cpuItem).toMatchObject({ x: 0, y: 0, width: 6, height: 8 });
		const tableItem = items.find(
			(item) =>
				(item.content as { $ref?: string } | undefined)?.$ref ===
				'#/spec/panels/grafana-panel-4',
		);
		// w: 24 -> 12
		expect(tableItem).toMatchObject({ width: 12, height: 6 });
	});

	it('converts query, custom and textbox variables and skips datasource ones', () => {
		expect(spec.variables).toHaveLength(3);
		const queryVar = spec.variables.find(
			(variable) =>
				variable.kind === 'ListVariable' && variable.spec.name === 'instance',
		);
		expect(queryVar).toBeDefined();
		const customVar = spec.variables.find(
			(variable) =>
				variable.kind === 'ListVariable' && variable.spec.name === 'env',
		);
		expect(customVar).toBeDefined();
		const textVar = spec.variables.find(
			(variable) => variable.kind === 'TextVariable',
		);
		expect(textVar).toBeDefined();
		expect(
			warnings.some((warning) => warning.includes('"ds"')),
		).toBe(true);
	});
});

describe('grafanaToPostable', () => {
	it('builds a postable v6 payload with generateName', () => {
		const { payload, warnings } = grafanaToPostable(
			GRAFANA_FIXTURE as unknown as Record<string, unknown>,
		);
		expect(payload.schemaVersion).toBe('v6');
		expect(payload.generateName).toBe(true);
		expect(payload.spec.display.name).toBe('Node Exporter');
		expect(payload.tags).toEqual([
			{ key: 'grafana', value: 'node' },
			{ key: 'grafana', value: 'prometheus' },
		]);
		expect(warnings.length).toBeGreaterThan(0);
	});

	it('falls back to a default title when the export has none', () => {
		const { payload } = grafanaToPostable({ panels: [], schemaVersion: 38 });
		expect(payload.spec.display.name).toBe('Imported Grafana dashboard');
	});
});
