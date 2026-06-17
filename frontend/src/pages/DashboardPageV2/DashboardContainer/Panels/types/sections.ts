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
 * The single source of truth for sections: each section ↔ exactly one slice of the
 * panel spec it edits. The slice type is uniform across every panel kind that shows
 * the section, so a section editor is written once and reused everywhere.
 *
 * Most slices live under the plugin spec (`spec.plugin.spec.<key>`); a few are
 * panel-level (`contextLinks` → `spec.links`). The section registry's lens (see
 * `ConfigPane/sectionRegistry`) abstracts over both, so this map stays purely about
 * "what shape does this section edit".
 *
 * `SectionKind` is derived below as `ControlledSectionKind | AtomicSectionKind`; the
 * `satisfies Record<SectionKind, …>` checks on `SectionControls` + `SECTION_METADATA`
 * keep all three structures covering the exact same set of kinds.
 */
// Formatting slice spans the union of every kind's formatting DTO: a single `unit`
// + `decimalPrecision` (most kinds) plus Table's per-column `columnUnits`. The
// per-kind `controls` bag gates which fields each editor writes, so a kind never
// writes a field its real DTO lacks (cast localized in the registry).
export type PanelFormattingSlice = DashboardtypesPanelFormattingDTO &
	Pick<DashboardtypesTableFormattingDTO, 'columnUnits'>;

export interface SectionSpecMap {
	formatting: PanelFormattingSlice; // spec.plugin.spec.formatting
	axes: DashboardtypesAxesDTO; // spec.plugin.spec.axes
	legend: DashboardtypesLegendDTO; // spec.plugin.spec.legend
	chartAppearance: DashboardtypesTimeSeriesChartAppearanceDTO; // spec.plugin.spec.chartAppearance
	buckets: DashboardtypesHistogramBucketsDTO; // spec.plugin.spec.histogramBuckets
	// spec.plugin.spec.visualization. Typed as the Bar shape because it's the widest
	// superset (stackedBarChart + fillSpans + timePreference); other kinds' visualization
	// DTOs are subsets. The per-kind `controls` bag gates which fields each editor writes,
	// so a kind never writes a field its real DTO lacks (cast localized in the registry).
	visualization: DashboardtypesBarChartVisualizationDTO;
	// spec.plugin.spec.thresholds. One slice, three element shapes (see ThresholdVariant);
	// the per-kind `variant` control picks the editor, so a kind only ever reads/writes the
	// shape its spec actually stores.
	thresholds: AnyThreshold[];
	contextLinks: DashboardLinkDTO[]; // spec.links (PANEL-level)
	columns: TelemetrytypesTelemetryFieldKeyDTO[]; // spec.plugin.spec.selectFields (List)
}

/**
 * (1) CONTROLLED sections — those with multiple independently-pickable sub-features.
 * The per-kind bag lets a kind expose a SUBSET of the section's controls (the V2
 * analogue of V1's `allowSoftMinMax` / `allowLegendColors` flags). Every key here
 * corresponds to a real, editable field on the section's spec slice.
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
	// timePreference → per-panel time scope (all kinds); stacking → stackedBarChart (Bar);
	// fillSpans → fill data gaps with 0 (TimeSeries). Each kind exposes only its subset.
	visualization: {
		timePreference?: boolean;
		stacking?: boolean;
		fillSpans?: boolean;
	};
	// Not a spec field but the editor discriminator: which threshold variant a kind edits
	// (label / comparison / table). All three persist to plugin.spec.thresholds.
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
 * What a panel kind declares in `kinds/<Kind>/sections.ts`. A controlled section is
 * declared with its `controls` subset; an atomic section is declared bare (`{ kind }`).
 *
 * Whether a kind ALLOWS a section at all is governed entirely by whether it appears in
 * the kind's `sections` array — e.g. Pie/Histogram omit `thresholds`, so it never shows.
 */
/**
 * Optional predicate to hide a section based on the current panel spec — for
 * cross-section rules (e.g. the Histogram legend is irrelevant once its queries are
 * merged into one distribution). Returning true removes the section from the pane.
 */
export type SectionVisibilityPredicate = (
	spec: DashboardtypesPanelSpecDTO,
) => boolean;

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
