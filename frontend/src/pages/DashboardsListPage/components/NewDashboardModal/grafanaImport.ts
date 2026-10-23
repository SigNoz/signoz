import {
	DashboardtypesDashboardSpecDTO,
	DashboardtypesDashboardSpecDTOPanels,
	DashboardtypesLayoutDTO,
	DashboardtypesPanelDTO,
	DashboardtypesPanelPluginKindDTO,
	DashboardtypesPostableDashboardV2DTO,
	DashboardtypesQueryDTO,
	DashboardtypesVariableDTO,
	Querybuildertypesv5RequestTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

/**
 * Minimal structural types for the parts of the Grafana dashboard JSON
 * schema this converter consumes. Grafana's full schema is large; only the
 * fields we map are declared here.
 */
interface GrafanaTarget {
	expr?: string;
	legendFormat?: string;
	hide?: boolean;
	refId?: string;
}

interface GrafanaGridPos {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface GrafanaPanel {
	id?: number;
	type?: string;
	title?: string;
	description?: string;
	gridPos?: GrafanaGridPos;
	targets?: GrafanaTarget[];
	/** Panels nested under a collapsed row. */
	panels?: GrafanaPanel[];
}

interface GrafanaVariableOption {
	value?: string | string[];
	selected?: boolean;
}

interface GrafanaVariable {
	name?: string;
	label?: string;
	type?: string;
	query?: string | { query?: string };
	options?: GrafanaVariableOption[];
	current?: { value?: string | string[] };
}

interface GrafanaDashboard {
	title?: string;
	description?: string;
	panels?: GrafanaPanel[];
	templating?: { list?: GrafanaVariable[] };
	schemaVersion?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	__inputs?: any;
	tags?: string[];
}

/**
 * Detects a Grafana dashboard export. Grafana exports carry a `panels` array
 * plus a numeric `schemaVersion` (or an `__inputs` block for provisioned
 * dashboards). This never matches SigNoz shapes: v2 dashboards carry a `spec`
 * object and legacy v1 dashboards carry a string `version`.
 */
export function isGrafanaDashboard(
	parsed: Record<string, unknown>,
): boolean {
	if ('spec' in parsed) {
		return false;
	}
	if (!Array.isArray(parsed.panels)) {
		return false;
	}
	return (
		typeof parsed.schemaVersion === 'number' || '__inputs' in parsed
	);
}

const GRAFANA_PANEL_KIND: Record<string, DashboardtypesPanelPluginKindDTO> = {
	timeseries: 'signoz/TimeSeriesPanel',
	graph: 'signoz/TimeSeriesPanel',
	stat: 'signoz/NumberPanel',
	gauge: 'signoz/NumberPanel',
	table: 'signoz/TablePanel',
	'table-old': 'signoz/TablePanel',
	piechart: 'signoz/PieChartPanel',
	barchart: 'signoz/BarChartPanel',
	text: 'signoz/TextPanel',
	heatmap: 'signoz/HeatmapPanel',
	histogram: 'signoz/HistogramPanel',
};

function mapPanelKind(grafanaType: string | undefined): {
	kind: DashboardtypesPanelPluginKindDTO;
	unmapped: boolean;
} {
	if (grafanaType && grafanaType in GRAFANA_PANEL_KIND) {
		return { kind: GRAFANA_PANEL_KIND[grafanaType], unmapped: false };
	}
	// eslint-disable-next-line no-console
	console.warn(
		`[grafana-import] unsupported panel type "${grafanaType ?? 'unknown'}", falling back to TimeSeriesPanel`,
	);
	return { kind: 'signoz/TimeSeriesPanel', unmapped: true };
}

/**
 * Grafana request type per panel kind: single-value panels read scalars,
 * tables read raw frames, everything else reads time series.
 */
function requestTypeForPanel(
	pluginKind: DashboardtypesPanelPluginKindDTO,
): Querybuildertypesv5RequestTypeDTO {
	switch (pluginKind) {
		case 'signoz/NumberPanel':
			return 'scalar';
		case 'signoz/TablePanel':
			return 'raw';
		default:
			return 'time_series';
	}
}

function convertQueries(
	targets: GrafanaTarget[] | undefined,
	pluginKind: DashboardtypesPanelPluginKindDTO,
): { queries: DashboardtypesQueryDTO[]; skipped: number } {
	const queries: DashboardtypesQueryDTO[] = [];
	let skipped = 0;
	const requestType = requestTypeForPanel(pluginKind);

	(targets ?? []).forEach((target, index) => {
		if (target.hide || !target.expr || target.expr.trim() === '') {
			skipped += 1;
			return;
		}
		const name = target.refId || String.fromCharCode(65 + index);
		queries.push({
			kind: requestType,
			spec: {
				name,
				plugin: {
					kind: 'signoz/PromQLQuery',
					spec: {
						name,
						query: target.expr,
						...(target.legendFormat
							? { legend: target.legendFormat }
							: {}),
					},
				},
			},
		});
	});

	return { queries, skipped };
}

export interface ConvertedPanel {
	id: string;
	panel: DashboardtypesPanelDTO;
	gridPos?: GrafanaGridPos;
}

/**
 * Flattens Grafana's panel tree. Row panels (`type: 'row'`) are layout-only
 * in Grafana; their nested panels are hoisted to the top level so every
 * converted panel lands in the flat `spec.panels` map.
 */
function flattenPanels(panels: GrafanaPanel[] | undefined): GrafanaPanel[] {
	const flat: GrafanaPanel[] = [];
	(panels ?? []).forEach((panel) => {
		if (panel.type === 'row') {
			flat.push(...flattenPanels(panel.panels));
			return;
		}
		flat.push(panel);
	});
	return flat;
}

function convertPanels(panels: GrafanaPanel[] | undefined): {
	converted: ConvertedPanel[];
	warnings: string[];
} {
	const converted: ConvertedPanel[] = [];
	const warnings: string[] = [];
	const usedIds = new Set<string>();

	flattenPanels(panels).forEach((panel, index) => {
		const { kind, unmapped } = mapPanelKind(panel.type);
		if (unmapped) {
			warnings.push(
				`Panel "${panel.title ?? `#${index}`}" has unsupported type "${panel.type ?? 'unknown'}" — imported as a time series panel.`,
			);
		}
		const { queries, skipped } = convertQueries(panel.targets, kind);
		if (skipped > 0) {
			warnings.push(
				`Panel "${panel.title ?? `#${index}`}": skipped ${skipped} quer${
					skipped === 1 ? 'y' : 'ies'
				} without a PromQL expression.`,
			);
		}

		let id =
			typeof panel.id === 'number'
				? `grafana-panel-${panel.id}`
				: `grafana-panel-${index}`;
		let suffix = 1;
		while (usedIds.has(id)) {
			id = `${id}-${suffix}`;
			suffix += 1;
		}
		usedIds.add(id);

		converted.push({
			id,
			panel: {
				kind: 'Panel',
				spec: {
					display: {
						name: panel.title || `Panel ${index + 1}`,
						...(panel.description
							? { description: panel.description }
							: {}),
					},
					plugin: { kind, spec: {} },
					queries,
				},
			},
			gridPos: panel.gridPos,
		});
	});

	return { converted, warnings };
}

/**
 * Grafana uses a 24-column grid; SigNoz (Perses) uses 12 columns.
 * Halve x/width, keep y/height as-is.
 */
function convertLayouts(converted: ConvertedPanel[]): DashboardtypesLayoutDTO[] {
	const items = converted.map(({ id, gridPos }) => ({
		x: gridPos ? Math.floor(gridPos.x / 2) : 0,
		y: gridPos ? gridPos.y : 0,
		width: gridPos ? Math.max(1, Math.round(gridPos.w / 2)) : 6,
		height: gridPos ? gridPos.h : 6,
		content: { $ref: `#/spec/panels/${id}` },
	}));

	return [{ kind: 'Grid', spec: { items } }];
}

function firstString(value: unknown): string | undefined {
	if (typeof value === 'string') {
		return value;
	}
	if (Array.isArray(value)) {
		const first = value.find((v) => typeof v === 'string');
		return typeof first === 'string' ? first : undefined;
	}
	return undefined;
}

function convertVariables(
	list: GrafanaVariable[] | undefined,
): { variables: DashboardtypesVariableDTO[]; warnings: string[] } {
	const variables: DashboardtypesVariableDTO[] = [];
	const warnings: string[] = [];

	(list ?? []).forEach((variable) => {
		if (!variable.name) {
			return;
		}
		const displayName = variable.label || variable.name;

		if (variable.type === 'custom') {
			const selectedOption = (variable.options ?? []).find(
				(option) => option.selected,
			);
			const customValue =
				firstString(selectedOption?.value) ??
				firstString(variable.current?.value) ??
				'';
			variables.push({
				kind: 'ListVariable',
				spec: {
					name: variable.name,
					display: { name: displayName },
					plugin: {
						kind: 'signoz/CustomVariable',
						spec: { customValue },
					},
				},
			});
			return;
		}

		if (variable.type === 'query') {
			const queryValue =
				typeof variable.query === 'string'
					? variable.query
					: variable.query?.query ?? '';
			variables.push({
				kind: 'ListVariable',
				spec: {
					name: variable.name,
					display: { name: displayName },
					plugin: {
						kind: 'signoz/QueryVariable',
						spec: { queryValue },
					},
				},
			});
			return;
		}

		if (variable.type === 'textbox' || variable.type === 'constant') {
			variables.push({
				kind: 'TextVariable',
				spec: {
					name: variable.name,
					display: { name: displayName },
					value: firstString(variable.current?.value) ?? '',
				},
			});
			return;
		}

		// datasource / interval / adhoc variables have no SigNoz equivalent.
		warnings.push(
			`Variable "${variable.name}" is of type "${variable.type}", which has no SigNoz equivalent — skipped.`,
		);
	});

	return { variables, warnings };
}

export interface GrafanaConversionResult {
	spec: DashboardtypesDashboardSpecDTO;
	panels: DashboardtypesDashboardSpecDTOPanels;
	warnings: string[];
}

/**
 * Converts a Grafana dashboard export into a SigNoz v2 dashboard spec.
 * PromQL expressions pass through natively via the `signoz/PromQLQuery`
 * plugin — no query translation is performed. Anything without a SigNoz
 * equivalent (unsupported panel types, hidden/empty targets, datasource /
 * interval / adhoc variables) is skipped with a warning.
 */
export function convertGrafanaDashboard(
	parsed: Record<string, unknown>,
): GrafanaConversionResult {
	const dashboard = parsed as unknown as GrafanaDashboard;
	const warnings: string[] = [];

	const { converted, warnings: panelWarnings } = convertPanels(
		dashboard.panels,
	);
	warnings.push(...panelWarnings);

	const panels: DashboardtypesDashboardSpecDTOPanels = {};
	converted.forEach(({ id, panel }) => {
		panels[id] = panel;
	});

	const { variables, warnings: variableWarnings } = convertVariables(
		dashboard.templating?.list,
	);
	warnings.push(...variableWarnings);

	const spec: DashboardtypesDashboardSpecDTO = {
		display: {
			name: dashboard.title || 'Imported Grafana dashboard',
			...(dashboard.description
				? { description: dashboard.description }
				: {}),
		},
		layouts: convertLayouts(converted),
		panels,
		variables,
	};

	return { spec, panels, warnings };
}

/**
 * Builds the full postable payload for a Grafana import, matching the shape
 * `normalizeToPostable` produces for native SigNoz dashboards.
 */
export function grafanaToPostable(
	parsed: Record<string, unknown>,
): {
	payload: DashboardtypesPostableDashboardV2DTO;
	warnings: string[];
} {
	const { spec, warnings } = convertGrafanaDashboard(parsed);
	const dashboard = parsed as unknown as GrafanaDashboard;

	return {
		payload: {
			schemaVersion: 'v6',
			generateName: true,
			tags:
				dashboard.tags && dashboard.tags.length > 0
					? dashboard.tags.map((tag) => ({ key: 'grafana', value: tag }))
					: null,
			spec,
		},
		warnings,
	};
}
