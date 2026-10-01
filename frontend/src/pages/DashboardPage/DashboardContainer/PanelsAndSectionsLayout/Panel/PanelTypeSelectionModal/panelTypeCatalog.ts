import { PANEL_OPTIONS, type PanelOption } from '../../../Panels/registry';
import type { PanelKind } from '../../../Panels/types/panelKind';

export type PanelTypeGroupId =
	| 'trends'
	| 'compare'
	| 'distributions'
	| 'single'
	| 'raw'
	| 'docs';

export const PANEL_TYPE_GROUPS: { id: PanelTypeGroupId; label: string }[] = [
	{ id: 'trends', label: 'Trends over time' },
	{ id: 'compare', label: 'Compare & rank' },
	{ id: 'distributions', label: 'Distributions' },
	{ id: 'single', label: 'Single values' },
	{ id: 'raw', label: 'Raw records' },
	{ id: 'docs', label: 'Documentation' },
];

interface PanelTypeMeta {
	group: PanelTypeGroupId;
	description: string;
	isNew?: boolean;
}

// Total over PanelKind, so a new kind fails to compile until it's placed in a group.
const PANEL_TYPE_META: Record<PanelKind, PanelTypeMeta> = {
	'signoz/TimeSeriesPanel': {
		group: 'trends',
		description: 'Values plotted against time',
	},
	'signoz/AreaChartPanel': {
		group: 'trends',
		description: 'Stacked volume over time',
		isNew: true,
	},
	'signoz/BarChartPanel': {
		group: 'compare',
		description: 'Compare values across categories',
	},
	'signoz/PieChartPanel': { group: 'compare', description: 'Share of a whole' },
	'signoz/ScatterPlotPanel': {
		group: 'compare',
		description: 'Two values per group, plotted against each other',
		isNew: true,
	},
	'signoz/HistogramPanel': {
		group: 'distributions',
		description: 'Distribution of values into buckets',
	},
	'signoz/NumberPanel': {
		group: 'single',
		description: 'One aggregate value, large',
	},
	'signoz/TablePanel': {
		group: 'raw',
		description: 'Rows and columns of results',
	},
	'signoz/ListPanel': { group: 'raw', description: 'Raw log and span records' },
	'signoz/TextPanel': {
		group: 'docs',
		description: 'Markdown notes and context',
		isNew: true,
	},
};

export type PanelTypeItem = PanelOption & Omit<PanelTypeMeta, 'group'>;

export interface PanelTypeGroup {
	id: PanelTypeGroupId;
	label: string;
	items: PanelTypeItem[];
}

/** Every group with the items matching `query` (name, description or group label); empty groups included. */
export function filterPanelTypeGroups(query: string): PanelTypeGroup[] {
	const q = query.trim().toLowerCase();
	return PANEL_TYPE_GROUPS.map(({ id, label }) => ({
		id,
		label,
		items: PANEL_OPTIONS.filter(({ kind }) => PANEL_TYPE_META[kind].group === id)
			.map((option) => ({ ...option, ...PANEL_TYPE_META[option.kind] }))
			.filter(
				(item) =>
					!q ||
					item.displayName.toLowerCase().includes(q) ||
					item.description.toLowerCase().includes(q) ||
					label.toLowerCase().includes(q),
			),
	}));
}
