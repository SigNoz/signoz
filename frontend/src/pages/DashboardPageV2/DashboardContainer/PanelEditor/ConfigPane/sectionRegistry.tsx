import type { ComponentType } from 'react';
import type {
	DashboardtypesLinkDTO,
	DashboardtypesAxesDTO,
	DashboardtypesBarChartVisualizationDTO,
	DashboardtypesHistogramBucketsDTO,
	DashboardtypesLegendDTO,
	DashboardtypesPanelSpecDTO,
	DashboardtypesTimeSeriesChartAppearanceDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	SectionKind,
	type AnyThreshold,
	type PanelFormattingSlice,
	type SectionEditorProps,
	type SectionSpecMap,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

import type { SectionEditorContext } from './sectionContext';
import AxesSection from './sections/AxesSection/AxesSection';
import BucketsSection from './sections/BucketsSection/BucketsSection';
import ChartAppearanceSection from './sections/ChartAppearanceSection/ChartAppearanceSection';
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
	get: (spec: PanelSpec) => SectionSpecMap[K] | undefined;
	update: (spec: PanelSpec, value: SectionSpecMap[K]) => PanelSpec;
}

// The plugin spec is a discriminated union over panel kinds; reading/writing a shared
// slice (formatting, axes, …) by key is the one place the union must be narrowed. The
// helper concentrates that cast so the registry entries stay declarative.
type PluginSpecSlice = Partial<Record<string, unknown>>;

function getPluginSlice<T>(spec: PanelSpec, key: string): T | undefined {
	return (spec.plugin.spec as PluginSpecSlice)[key] as T | undefined;
}

function updatePluginSlice(
	spec: PanelSpec,
	key: string,
	value: unknown,
): PanelSpec {
	return {
		...spec,
		plugin: {
			...spec.plugin,
			spec: { ...(spec.plugin.spec as PluginSpecSlice), [key]: value },
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
	[SectionKind.Formatting]: {
		Component: FormattingSection,
		get: (spec): PanelFormattingSlice | undefined =>
			getPluginSlice<PanelFormattingSlice>(spec, 'formatting'),
		update: (spec, formatting): PanelSpec =>
			updatePluginSlice(spec, 'formatting', formatting),
	},
	[SectionKind.Axes]: {
		Component: AxesSection,
		get: (spec): DashboardtypesAxesDTO | undefined =>
			getPluginSlice<DashboardtypesAxesDTO>(spec, 'axes'),
		update: (spec, axes): PanelSpec => updatePluginSlice(spec, 'axes', axes),
	},
	[SectionKind.Legend]: {
		Component: LegendSection,
		get: (spec): DashboardtypesLegendDTO | undefined =>
			getPluginSlice<DashboardtypesLegendDTO>(spec, 'legend'),
		update: (spec, legend): PanelSpec =>
			updatePluginSlice(spec, 'legend', legend),
	},
	[SectionKind.ChartAppearance]: {
		Component: ChartAppearanceSection,
		get: (spec): DashboardtypesTimeSeriesChartAppearanceDTO | undefined =>
			getPluginSlice<DashboardtypesTimeSeriesChartAppearanceDTO>(
				spec,
				'chartAppearance',
			),
		update: (spec, chartAppearance): PanelSpec =>
			updatePluginSlice(spec, 'chartAppearance', chartAppearance),
	},
	[SectionKind.Visualization]: {
		Component: VisualizationSection,
		get: (spec): DashboardtypesBarChartVisualizationDTO | undefined =>
			getPluginSlice<DashboardtypesBarChartVisualizationDTO>(
				spec,
				'visualization',
			),
		update: (spec, visualization): PanelSpec =>
			updatePluginSlice(spec, 'visualization', visualization),
	},
	[SectionKind.Buckets]: {
		Component: BucketsSection,
		get: (spec): DashboardtypesHistogramBucketsDTO | undefined =>
			getPluginSlice<DashboardtypesHistogramBucketsDTO>(spec, 'histogramBuckets'),
		update: (spec, buckets): PanelSpec =>
			updatePluginSlice(spec, 'histogramBuckets', buckets),
	},
	[SectionKind.ContextLinks]: {
		Component: ContextLinksSection,
		// Panel-level slice (spec.links), not under the plugin spec — no cast needed.
		get: (spec): DashboardtypesLinkDTO[] | undefined => spec.links ?? undefined,
		update: (spec, links): PanelSpec => ({ ...spec, links }),
	},
	// One editor for every threshold variant (label / comparison / table); the kind's
	// `controls.variant` picks the row editor + element shape. All persist to the same
	// plugin.spec.thresholds key.
	[SectionKind.Thresholds]: {
		Component: ThresholdsSection,
		get: (spec): AnyThreshold[] | undefined =>
			getPluginSlice<AnyThreshold[]>(spec, 'thresholds'),
		update: (spec, thresholds): PanelSpec =>
			updatePluginSlice(spec, 'thresholds', thresholds),
	},
};

/**
 * A section descriptor with the kind correlation erased. `SECTION_REGISTRY[kind]` and a
 * `SectionConfig` are both unions keyed by the same `kind`, but TS can't prove the lookup
 * and the config refer to the same member — the classic correlated-union limitation. The
 * resolver below narrows once here (the single localized cast), so render sites compose
 * `get` → `Component` → `update` without any further casts.
 */
export interface ErasedSectionDescriptor {
	Component: ComponentType<
		{
			value: unknown;
			controls?: unknown;
			onChange: (next: unknown) => void;
		} & SectionEditorContext
	>;
	get: (spec: PanelSpec) => unknown;
	update: (spec: PanelSpec, value: unknown) => PanelSpec;
}

export function resolveSectionEditor(
	kind: SectionKind,
): ErasedSectionDescriptor | undefined {
	return SECTION_REGISTRY[kind] as unknown as
		| ErasedSectionDescriptor
		| undefined;
}
