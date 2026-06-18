import {
	BarChart,
	Columns3,
	Hash,
	ListEnd,
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

// Discriminated union derived from SectionControls — kept in lockstep automatically.
export type SectionConfig = {
	[K in SectionKind]: { kind: K; controls: SectionControls[K] };
}[SectionKind];
