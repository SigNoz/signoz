import type { ComponentType } from 'react';
import type {
	DashboardLinkDTO,
	DashboardtypesAxesDTO,
	DashboardtypesBarChartVisualizationDTO,
	DashboardtypesComparisonThresholdDTO,
	DashboardtypesHistogramBucketsDTO,
	DashboardtypesLegendDTO,
	DashboardtypesPanelFormattingDTO,
	DashboardtypesPanelSpecDTO,
	DashboardtypesThresholdWithLabelDTO,
	DashboardtypesTimeSeriesChartAppearanceDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	SectionEditorProps,
	SectionKind,
	SectionSpecMap,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import AxesSection from './sections/AxesSection/AxesSection';
import BucketsSection from './sections/BucketsSection/BucketsSection';
import ChartAppearanceSection from './sections/ChartAppearanceSection/ChartAppearanceSection';
import ComparisonThresholdsSection from './sections/ComparisonThresholdsSection/ComparisonThresholdsSection';
import ContextLinksSection from './sections/ContextLinksSection/ContextLinksSection';
import FormattingSection from './sections/FormattingSection/FormattingSection';
import LegendSection from './sections/LegendSection/LegendSection';
import ThresholdsSection from './sections/ThresholdsSection/ThresholdsSection';
import VisualizationSection from './sections/VisualizationSection/VisualizationSection';

type PanelSpec = DashboardtypesPanelSpecDTO;

/**
 * Pairs a section kind with its editor component and a typed lens into the panel spec.
 * The lens reads/writes over the WHOLE panel spec, so a section can target either the
 * plugin spec (`spec.plugin.spec.<key>`) or a panel-level field (e.g. `spec.links`).
 */
export interface SectionDescriptor<K extends SectionKind> {
	Component: ComponentType<SectionEditorProps<K>>;
	read: (spec: PanelSpec) => SectionSpecMap[K] | undefined;
	write: (spec: PanelSpec, value: SectionSpecMap[K]) => PanelSpec;
}

// The plugin spec is a discriminated union over panel kinds; reading/writing a shared
// slice (formatting, axes, …) by key is the one place the union must be narrowed. The
// helper concentrates that cast so the registry entries stay declarative.
type PluginSpecSlice = Partial<Record<string, unknown>>;

function readPluginSlice<T>(spec: PanelSpec, key: string): T | undefined {
	return (spec.plugin?.spec as PluginSpecSlice | undefined)?.[key] as
		| T
		| undefined;
}

function writePluginSlice(
	spec: PanelSpec,
	key: string,
	value: unknown,
): PanelSpec {
	return {
		...spec,
		plugin: {
			...spec.plugin,
			spec: { ...(spec.plugin?.spec as PluginSpecSlice), [key]: value },
		},
	} as PanelSpec;
}

/**
 * Registry of section editors. Partial by design: only sections with a built editor
 * appear here, so ConfigPane renders exactly those and silently skips the rest. Adding
 * a section editor = one entry here + one component file.
 */
export const SECTION_REGISTRY: {
	[K in SectionKind]?: SectionDescriptor<K>;
} = {
	formatting: {
		Component: FormattingSection,
		read: (spec): DashboardtypesPanelFormattingDTO | undefined =>
			readPluginSlice<DashboardtypesPanelFormattingDTO>(spec, 'formatting'),
		write: (spec, formatting): PanelSpec =>
			writePluginSlice(spec, 'formatting', formatting),
	},
	axes: {
		Component: AxesSection,
		read: (spec): DashboardtypesAxesDTO | undefined =>
			readPluginSlice<DashboardtypesAxesDTO>(spec, 'axes'),
		write: (spec, axes): PanelSpec => writePluginSlice(spec, 'axes', axes),
	},
	legend: {
		Component: LegendSection,
		read: (spec): DashboardtypesLegendDTO | undefined =>
			readPluginSlice<DashboardtypesLegendDTO>(spec, 'legend'),
		write: (spec, legend): PanelSpec => writePluginSlice(spec, 'legend', legend),
	},
	chartAppearance: {
		Component: ChartAppearanceSection,
		read: (spec): DashboardtypesTimeSeriesChartAppearanceDTO | undefined =>
			readPluginSlice<DashboardtypesTimeSeriesChartAppearanceDTO>(
				spec,
				'chartAppearance',
			),
		write: (spec, chartAppearance): PanelSpec =>
			writePluginSlice(spec, 'chartAppearance', chartAppearance),
	},
	visualization: {
		Component: VisualizationSection,
		read: (spec): DashboardtypesBarChartVisualizationDTO | undefined =>
			readPluginSlice<DashboardtypesBarChartVisualizationDTO>(
				spec,
				'visualization',
			),
		write: (spec, visualization): PanelSpec =>
			writePluginSlice(spec, 'visualization', visualization),
	},
	buckets: {
		Component: BucketsSection,
		read: (spec): DashboardtypesHistogramBucketsDTO | undefined =>
			readPluginSlice<DashboardtypesHistogramBucketsDTO>(spec, 'histogramBuckets'),
		write: (spec, buckets): PanelSpec =>
			writePluginSlice(spec, 'histogramBuckets', buckets),
	},
	contextLinks: {
		Component: ContextLinksSection,
		// Panel-level slice (spec.links), not under the plugin spec — no cast needed.
		read: (spec): DashboardLinkDTO[] | undefined => spec.links,
		write: (spec, links): PanelSpec => ({ ...spec, links }),
	},
	thresholds: {
		Component: ThresholdsSection,
		read: (spec): DashboardtypesThresholdWithLabelDTO[] | undefined =>
			readPluginSlice<DashboardtypesThresholdWithLabelDTO[]>(spec, 'thresholds'),
		write: (spec, thresholds): PanelSpec =>
			writePluginSlice(spec, 'thresholds', thresholds),
	},
	// Same plugin.spec.thresholds key, but Number's comparison-operator element shape.
	comparisonThresholds: {
		Component: ComparisonThresholdsSection,
		read: (spec): DashboardtypesComparisonThresholdDTO[] | undefined =>
			readPluginSlice<DashboardtypesComparisonThresholdDTO[]>(spec, 'thresholds'),
		write: (spec, thresholds): PanelSpec =>
			writePluginSlice(spec, 'thresholds', thresholds),
	},
};

/**
 * A section descriptor with the kind correlation erased. `SECTION_REGISTRY[kind]` and a
 * `SectionConfig` are both unions keyed by the same `kind`, but TS can't prove the lookup
 * and the config refer to the same member — the classic correlated-union limitation. The
 * resolver below narrows once here (the single localized cast), so render sites compose
 * `read` → `Component` → `write` without any further casts.
 */
export interface ErasedSectionDescriptor {
	Component: ComponentType<{
		value: unknown;
		controls?: unknown;
		onChange: (next: unknown) => void;
		// Forwarded to every editor; only sections that need the panel's resolved series
		// (legend colors) read it. Optional so editors can ignore it.
		legendSeries?: unknown;
		// The panel's formatting unit; read by editors that scope to it (thresholds).
		yAxisUnit?: unknown;
	}>;
	read: (spec: PanelSpec) => unknown;
	write: (spec: PanelSpec, value: unknown) => PanelSpec;
}

export function resolveSectionEditor(
	kind: SectionKind,
): ErasedSectionDescriptor | undefined {
	return SECTION_REGISTRY[kind] as unknown as
		| ErasedSectionDescriptor
		| undefined;
}
