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
import type {
	DashboardtypesBarChartPanelSpecDTO,
	DashboardtypesHistogramPanelSpecDTO,
	DashboardtypesListPanelSpecDTO,
	DashboardtypesNumberPanelSpecDTO,
	DashboardtypesPieChartPanelSpecDTO,
	DashboardtypesTablePanelSpecDTO,
	DashboardtypesTimeSeriesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';

export type PanelKind =
	| 'signoz/TimeSeriesPanel'
	| 'signoz/BarChartPanel'
	| 'signoz/NumberPanel'
	| 'signoz/PieChartPanel'
	| 'signoz/TablePanel'
	| 'signoz/HistogramPanel'
	| 'signoz/ListPanel';

// Maps each PanelKind to its concrete perses spec type. Keeping this in lockstep
// with PanelKind is the (single) maintenance cost of the keyed registry — in
// exchange we get cast-free registration and precise types after kind narrowing.
export type SpecForKind<K extends PanelKind> =
	K extends 'signoz/TimeSeriesPanel'
		? DashboardtypesTimeSeriesPanelSpecDTO
		: K extends 'signoz/BarChartPanel'
			? DashboardtypesBarChartPanelSpecDTO
			: K extends 'signoz/NumberPanel'
				? DashboardtypesNumberPanelSpecDTO
				: K extends 'signoz/PieChartPanel'
					? DashboardtypesPieChartPanelSpecDTO
					: K extends 'signoz/TablePanel'
						? DashboardtypesTablePanelSpecDTO
						: K extends 'signoz/HistogramPanel'
							? DashboardtypesHistogramPanelSpecDTO
							: K extends 'signoz/ListPanel'
								? DashboardtypesListPanelSpecDTO
								: never;

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

export interface PanelRendererProps<Spec> {
	panelId: string;
	spec: Spec;
	query: Query | undefined;
	data: MetricQueryRangeSuccessResponse | undefined;
	isLoading: boolean;
	error: Error | null;
}

export interface PanelDefinition<Spec> {
	kind: PanelKind;
	displayName: string;
	Renderer: ComponentType<PanelRendererProps<Spec>>;
	sections: SectionConfig[];
	supportedSignals: DataSource[];
}

// The registry is a keyed map from PanelKind to a PanelDefinition with the
// matching concrete spec. Looking up by a kind variable yields a discriminated
// union of all registered definitions, each with its precise Spec.
export type PanelRegistry = {
	[K in PanelKind]?: PanelDefinition<SpecForKind<K>>;
};

export const PANEL_KIND_TO_PANEL_TYPE: Record<PanelKind, PANEL_TYPES> = {
	'signoz/TimeSeriesPanel': PANEL_TYPES.TIME_SERIES,
	'signoz/BarChartPanel': PANEL_TYPES.BAR,
	'signoz/NumberPanel': PANEL_TYPES.VALUE,
	'signoz/PieChartPanel': PANEL_TYPES.PIE,
	'signoz/TablePanel': PANEL_TYPES.TABLE,
	'signoz/HistogramPanel': PANEL_TYPES.HISTOGRAM,
	'signoz/ListPanel': PANEL_TYPES.LIST,
};
