import type { ComponentType } from 'react';
import {
	BarChart,
	Columns3,
	Hash,
	ListEnd,
	Palette,
	Ruler,
	SlidersHorizontal,
} from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import type {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { DataSource } from 'types/common/queryBuilder';

export type PanelKind =
	| 'signoz/TimeSeriesPanel'
	| 'signoz/BarChartPanel'
	| 'signoz/NumberPanel'
	| 'signoz/PieChartPanel'
	| 'signoz/TablePanel'
	| 'signoz/HistogramPanel'
	| 'signoz/ListPanel';

// Derived from an actual icon component so the type stays exact (size is a
// constrained IconSize union, not arbitrary strings) and ForwardRef-compatible.
type SectionIcon = typeof Hash;

export interface SectionMetadata {
	title: string;
	icon: SectionIcon;
	description?: string;
}

// Source of truth for sections. Its keys define SectionKind; its values are the
// runtime UI metadata (consumed by PanelEditor in 1.8). Adding a new section =
// one entry here + one entry in SectionControls.
export const SECTIONS = {
	formatting: { title: 'Formatting', icon: Hash },
	axes: { title: 'Axes', icon: Ruler },
	legend: { title: 'Legend', icon: ListEnd },
	thresholds: { title: 'Thresholds', icon: SlidersHorizontal },
	chartAppearance: { title: 'Chart appearance', icon: Palette },
	columnUnits: { title: 'Column units', icon: Columns3 },
	buckets: { title: 'Buckets', icon: BarChart },
} as const satisfies Record<string, SectionMetadata>;

export type SectionKind = keyof typeof SECTIONS;

// Per-kind control toggles (type-only — runtime metadata is in SECTIONS).
// Section components type their controls prop via `SectionControls['axes']`.
export type SectionControls = {
	formatting: { unit?: boolean; decimals?: boolean };
	axes: { minMax?: boolean; unit?: boolean; logScale?: boolean };
	legend: { position?: boolean; mode?: boolean };
	thresholds: { list?: boolean };
	chartAppearance: {
		lineStyle?: boolean;
		fillOpacity?: boolean;
		stacked?: boolean;
	};
	columnUnits: { perColumnUnit?: boolean };
	buckets: { count?: boolean; min?: boolean; max?: boolean };
};

// Discriminated union derived from SectionControls — kept in lockstep automatically.
export type SectionConfig = {
	[K in SectionKind]: { kind: K; controls: SectionControls[K] };
}[SectionKind];

/**
 * Dashboard-wide rendering preferences propagated down to every panel renderer
 * on the same dashboard. Lets the shell push cross-panel concerns (cursor
 * sync, tooltip filter mode, dashboard id for scoped state) without each
 * renderer rediscovering them via hooks. All fields are optional — non-
 * dashboard render contexts (PanelEditor preview, standalone view) can pass
 * an empty object and the renderer will fall back to sensible defaults.
 */
export interface DashboardPreference {
	/**
	 * Cursor-sync mode for the dashboard. Drives the uPlot tooltip plugin so
	 * hovering one panel highlights the corresponding x on every other panel.
	 */
	syncMode?: DashboardCursorSync;
	/**
	 * Filter applied to the synced tooltip across panels (e.g. only show series
	 * whose label matches the hovered series).
	 */
	syncFilterMode?: SyncTooltipFilterMode;
	/**
	 * Dashboard id — useful for renderers that scope per-dashboard state
	 * (e.g. pinned-tooltip persistence, drill-down history).
	 */
	dashboardId?: string;
}

export interface PanelRendererProps {
	panelId: string;
	/**
	 * The whole perses panel — renderers derive their concrete `spec` and the
	 * perses-shaped `queries` from this. Passing the full panel keeps the prop
	 * surface stable as new panel-level fields are added to the wire format.
	 */
	panel: DashboardtypesPanelDTO | undefined;
	data: MetricQueryRangeSuccessResponse | undefined;
	isLoading: boolean;
	error: Error | null;
	/**
	 * Per-panel click handler — currently used by the uPlot onClick plugin to
	 * surface point-level interactions (drill-down trigger, log-row jump, etc.).
	 */
	onClickHandler?: OnClickPluginOpts['onClick'];
	/**
	 * Drag-to-zoom callback. The renderer wires this into the chart so the
	 * dashboard shell can update the global time range from a selection.
	 */
	onDragSelect: (start: number, end: number) => void;
	/** Gate for the drill-down right-click menu. Off by default in V2. */
	enableDrillDown?: boolean;
	/**
	 * Render context — varies behavior (e.g. dashboard widget vs. standalone
	 * full-screen vs. inside the editor). See PanelMode for the contract.
	 */
	panelMode: PanelMode;
	/**
	 * Dashboard-level preferences that should propagate to every panel
	 * (cursor sync, tooltip filter mode, dashboard id). The shell owns
	 * resolving these; the renderer just consumes them.
	 */
	dashboardPreference?: DashboardPreference;
}

export interface PanelDefinition {
	kind: PanelKind;
	displayName: string;
	Renderer: ComponentType<PanelRendererProps>;
	sections: SectionConfig[];
	supportedSignals: DataSource[];
}

// Keyed map from PanelKind to its PanelDefinition. The Renderer signature is
// uniform across kinds (each renderer narrows the panel.spec.plugin.spec union
// internally), so no per-kind type parametrization is needed at the registry
// level.
export type PanelRegistry = Partial<Record<PanelKind, PanelDefinition>>;

export const PANEL_KIND_TO_PANEL_TYPE: Record<PanelKind, PANEL_TYPES> = {
	'signoz/TimeSeriesPanel': PANEL_TYPES.TIME_SERIES,
	'signoz/BarChartPanel': PANEL_TYPES.BAR,
	'signoz/NumberPanel': PANEL_TYPES.VALUE,
	'signoz/PieChartPanel': PANEL_TYPES.PIE,
	'signoz/TablePanel': PANEL_TYPES.TABLE,
	'signoz/HistogramPanel': PANEL_TYPES.HISTOGRAM,
	'signoz/ListPanel': PANEL_TYPES.LIST,
};
