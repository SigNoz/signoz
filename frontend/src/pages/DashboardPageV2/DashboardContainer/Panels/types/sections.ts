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
 * Which threshold editor a kind uses. All three variants persist to the same
 * `plugin.spec.thresholds` key but with different element shapes, so one section
 * (`thresholds`) drives all of them, discriminated by this variant:
 * - `label` — value + color + label lines (TimeSeries / Bar)
 * - `comparison` — value crosses an operator → recolor (Number)
 * - `table` — per-column comparison (Table)
 */
export type ThresholdVariant = 'label' | 'comparison' | 'table';

/** Union of every threshold element shape stored under `plugin.spec.thresholds`. */
export type AnyThreshold =
	| DashboardtypesThresholdWithLabelDTO
	| DashboardtypesComparisonThresholdDTO
	| DashboardtypesTableThresholdDTO;

/**
 * Each section ↔ one slice of the panel spec it edits, uniform across every kind
 * that shows the section. Most slices live under `spec.plugin.spec.<key>`;
 * `contextLinks` is panel-level (`spec.links`).
 */
// Spans every kind's formatting DTO: `unit` + `decimalPrecision` plus Table's
// per-column `columnUnits`; the `controls` bag gates which a kind actually writes.
export type PanelFormattingSlice = DashboardtypesPanelFormattingDTO &
	Pick<DashboardtypesTableFormattingDTO, 'columnUnits'>;

export interface SectionSpecMap {
	formatting: PanelFormattingSlice; // spec.plugin.spec.formatting
	axes: DashboardtypesAxesDTO; // spec.plugin.spec.axes
	legend: DashboardtypesLegendDTO; // spec.plugin.spec.legend
	chartAppearance: DashboardtypesTimeSeriesChartAppearanceDTO; // spec.plugin.spec.chartAppearance
	buckets: DashboardtypesHistogramBucketsDTO; // spec.plugin.spec.histogramBuckets
	// spec.plugin.spec.visualization — typed as the Bar shape (widest superset);
	// the `controls` bag gates which fields each kind writes.
	visualization: DashboardtypesBarChartVisualizationDTO;
	thresholds: AnyThreshold[]; // spec.plugin.spec.thresholds (variant picks the editor)
	contextLinks: DashboardLinkDTO[]; // spec.links (PANEL-level)
	columns: TelemetrytypesTelemetryFieldKeyDTO[]; // spec.plugin.spec.selectFields (List)
}

/**
 * CONTROLLED sections — a kind exposes a SUBSET of the section's controls (V2
 * analogue of V1's `allowSoftMinMax` / `allowLegendColors` flags).
 */
export interface SectionControls {
	formatting: { unit?: boolean; decimals?: boolean; columnUnits?: boolean };
	axes: { minMax?: boolean; logScale?: boolean }; // minMax → softMin/softMax
	legend: { position?: boolean; colors?: boolean }; // colors → customColors
	chartAppearance: {
		lineStyle?: boolean;
		lineInterpolation?: boolean;
		fillMode?: boolean;
		showPoints?: boolean;
		spanGaps?: boolean;
	};
	buckets: { count?: boolean; width?: boolean; mergeQueries?: boolean };
	// stacking → stackedBarChart (Bar); fillSpans → fill gaps with 0 (TimeSeries).
	visualization: {
		timePreference?: boolean;
		stacking?: boolean;
		fillSpans?: boolean;
	};
	// Editor discriminator (not a spec field): which threshold variant a kind edits.
	thresholds: { variant?: ThresholdVariant };
}

export type ControlledSectionKind = keyof SectionControls;

/**
 * (2) ATOMIC sections — no sub-controls; a kind either shows them or not. Thresholds
 * and Context Links are each just a list editor, so there is nothing to subset.
 */
export type AtomicSectionKind = 'contextLinks' | 'columns';

export type SectionKind = ControlledSectionKind | AtomicSectionKind;

/**
 * Optional predicate to hide a section from the current spec (e.g. the Histogram
 * legend once its queries are merged). Returning true removes it from the pane.
 */
export type SectionVisibilityPredicate = (
	spec: DashboardtypesPanelSpecDTO,
) => boolean;

/**
 * What a kind declares in `kinds/<Kind>/sections.ts`: a controlled section with its
 * `controls` subset, or an atomic section bare (`{ kind }`).
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

// Runtime UI metadata per section (title + sidebar icon). Pure data — no component
// coupling. The editor component + spec lens live in the ConfigPane section registry.
export const SECTION_METADATA = {
	formatting: { title: 'Formatting', icon: Hash },
	axes: { title: 'Axes', icon: Ruler },
	legend: { title: 'Legend', icon: Layers },
	chartAppearance: { title: 'Chart appearance', icon: Palette },
	visualization: { title: 'Visualization', icon: LayoutDashboard },
	buckets: { title: 'Histogram / Buckets', icon: BarChart },
	thresholds: { title: 'Thresholds', icon: SlidersHorizontal },
	contextLinks: { title: 'Context Links', icon: Link },
	columns: { title: 'Columns', icon: Columns3 },
} as const satisfies Record<SectionKind, SectionMetadata>;

/**
 * Props every section editor receives — exactly its slice type (`value`), an
 * `onChange` to write the next slice, and (controlled sections only) the per-kind
 * `controls` subset. Atomic editors omit `controls`.
 */
export type SectionEditorProps<K extends SectionKind> = {
	value: SectionSpecMap[K] | undefined;
	onChange: (next: SectionSpecMap[K]) => void;
} & (K extends ControlledSectionKind
	? { controls: SectionControls[K] }
	: unknown);
