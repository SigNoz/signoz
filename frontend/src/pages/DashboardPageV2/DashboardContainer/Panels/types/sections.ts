import type {
	DashboardLinkDTO,
	DashboardtypesAxesDTO,
	DashboardtypesBarChartVisualizationDTO,
	DashboardtypesComparisonThresholdDTO,
	DashboardtypesHistogramBucketsDTO,
	DashboardtypesLegendDTO,
	DashboardtypesPanelFormattingDTO,
	DashboardtypesPanelSpecDTO,
	DashboardtypesTableFormattingDTO,
	DashboardtypesTableThresholdDTO,
	DashboardtypesThresholdWithLabelDTO,
	DashboardtypesTimeSeriesChartAppearanceDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	BarChart,
	Columns3,
	Hash,
	Layers,
	LayoutDashboard,
	Link,
	Palette,
	Ruler,
	SlidersHorizontal,
} from '@signozhq/icons';

// Derived from an actual icon component so the type stays exact (size is a
// constrained IconSize union, not arbitrary strings) and ForwardRef-compatible.
export type SectionIcon = typeof Hash;

export interface SectionMetadata {
	title: string;
	icon: SectionIcon;
	description?: string;
}

/**
 * Discriminant for each config section (the `kind` field of a `SectionConfig`). The
 * string values match the keys each slice persists under in the plugin spec.
 */
export enum SectionKind {
	Formatting = 'formatting',
	Axes = 'axes',
	Legend = 'legend',
	ChartAppearance = 'chartAppearance',
	Buckets = 'buckets',
	Visualization = 'visualization',
	Thresholds = 'thresholds',
	ContextLinks = 'contextLinks',
	Columns = 'columns',
}

/**
 * Which threshold editor a kind uses. All three variants persist to the same
 * `plugin.spec.thresholds` key with different element shapes:
 * - `label` — value + color + label lines (TimeSeries / Bar)
 * - `comparison` — value crosses an operator → recolor (Number)
 * - `table` — per-column comparison (Table)
 */
export enum ThresholdVariant {
	LABEL = 'label',
	COMPARISON = 'comparison',
	TABLE = 'table',
}

/** Union of every threshold element shape stored under `plugin.spec.thresholds`. */
export type AnyThreshold =
	| DashboardtypesThresholdWithLabelDTO
	| DashboardtypesComparisonThresholdDTO
	| DashboardtypesTableThresholdDTO;

/**
 * Each section ↔ one slice of the panel spec it edits. Most slices live under
 * `spec.plugin.spec.<key>`; `contextLinks` is panel-level (`spec.links`).
 */
// Superset spanning every kind's formatting DTO; the `controls` bag gates which
// fields a kind actually writes.
export type PanelFormattingSlice = DashboardtypesPanelFormattingDTO &
	Pick<DashboardtypesTableFormattingDTO, 'columnUnits'>;

export interface SectionSpecMap {
	[SectionKind.Formatting]: PanelFormattingSlice; // spec.plugin.spec.formatting
	[SectionKind.Axes]: DashboardtypesAxesDTO; // spec.plugin.spec.axes
	[SectionKind.Legend]: DashboardtypesLegendDTO; // spec.plugin.spec.legend
	[SectionKind.ChartAppearance]: DashboardtypesTimeSeriesChartAppearanceDTO; // spec.plugin.spec.chartAppearance
	[SectionKind.Buckets]: DashboardtypesHistogramBucketsDTO; // spec.plugin.spec.histogramBuckets
	// spec.plugin.spec.visualization — typed as the Bar shape (widest superset);
	// the `controls` bag gates which fields each kind writes.
	[SectionKind.Visualization]: DashboardtypesBarChartVisualizationDTO;
	[SectionKind.Thresholds]: AnyThreshold[]; // spec.plugin.spec.thresholds (variant picks the editor)
	[SectionKind.ContextLinks]: DashboardLinkDTO[]; // spec.links (PANEL-level)
	[SectionKind.Columns]: TelemetrytypesTelemetryFieldKeyDTO[]; // spec.plugin.spec.selectFields (List)
}

/**
 * Controlled sections — a kind exposes a subset of the section's controls (V2
 * analogue of V1's `allowSoftMinMax` / `allowLegendColors` flags).
 */
export interface SectionControls {
	[SectionKind.Formatting]: {
		unit?: boolean;
		decimals?: boolean;
		columnUnits?: boolean;
	};
	[SectionKind.Axes]: { minMax?: boolean; logScale?: boolean }; // minMax → softMin/softMax
	[SectionKind.Legend]: { position?: boolean; colors?: boolean }; // colors → customColors
	[SectionKind.ChartAppearance]: {
		lineStyle?: boolean;
		lineInterpolation?: boolean;
		fillMode?: boolean;
		showPoints?: boolean;
		spanGaps?: boolean;
	};
	[SectionKind.Buckets]: {
		count?: boolean;
		width?: boolean;
		mergeQueries?: boolean;
	};
	// switchPanelKind → the visualization-type switcher (every kind, so you can switch
	// away from any panel); stacking → stackedBarChart (Bar); fillSpans → fill gaps with
	// 0 (TimeSeries).
	[SectionKind.Visualization]: {
		switchPanelKind: boolean;
		timePreference?: boolean;
		stacking?: boolean;
		fillSpans?: boolean;
	};
	// Editor discriminator (not a spec field): which threshold variant a kind edits.
	[SectionKind.Thresholds]: { variant?: ThresholdVariant };
}

export type ControlledSectionKind = keyof SectionControls;

/** Atomic sections — no sub-controls; a kind either shows them or not. */
export type AtomicSectionKind = SectionKind.ContextLinks | SectionKind.Columns;

/** Predicate to hide a section from the current spec; returning true removes it. */
export type SectionVisibilityPredicate = (
	spec: DashboardtypesPanelSpecDTO,
) => boolean;

/**
 * What a kind declares in `kinds/<Kind>/sections.ts`: a controlled section with
 * its `controls` subset, or an atomic section bare (`{ kind }`).
 */
export type SectionConfig =
	| {
			[K in ControlledSectionKind]: {
				kind: K;
				controls: SectionControls[K];
				isHidden?: SectionVisibilityPredicate;
			};
	  }[ControlledSectionKind]
	| { kind: AtomicSectionKind; isHidden?: SectionVisibilityPredicate };

// Per-section title + sidebar icon. Pure data; the editor component + spec lens
// live in the ConfigPane section registry.
export const SECTION_METADATA = {
	[SectionKind.Formatting]: { title: 'Formatting & Units', icon: Hash },
	[SectionKind.Axes]: { title: 'Axes', icon: Ruler },
	[SectionKind.Legend]: { title: 'Legend', icon: Layers },
	[SectionKind.ChartAppearance]: { title: 'Chart appearance', icon: Palette },
	[SectionKind.Visualization]: { title: 'Visualization', icon: LayoutDashboard },
	[SectionKind.Buckets]: { title: 'Histogram / Buckets', icon: BarChart },
	[SectionKind.Thresholds]: { title: 'Thresholds', icon: SlidersHorizontal },
	[SectionKind.ContextLinks]: { title: 'Context Links', icon: Link },
	[SectionKind.Columns]: { title: 'Columns', icon: Columns3 },
} as const satisfies Record<SectionKind, SectionMetadata>;

/**
 * Props every section editor receives: its slice (`value`), an `onChange`, and
 * (controlled sections only) the per-kind `controls` subset.
 */
export type SectionEditorProps<K extends SectionKind> = {
	value: SectionSpecMap[K] | undefined;
	onChange: (next: SectionSpecMap[K]) => void;
} & (K extends ControlledSectionKind
	? { controls: SectionControls[K] }
	: unknown);
