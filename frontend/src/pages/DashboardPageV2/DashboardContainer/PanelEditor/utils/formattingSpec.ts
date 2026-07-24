import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelFormattingSlice } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/sections';

// `spec.plugin.spec` is a discriminated union over panel kinds; these helpers narrow
// to the shared `formatting` slice via a single localized cast at the boundary, so
// callers read/write it without repeating the spread.

export function readFormatting(
	spec: DashboardtypesPanelSpecDTO,
): PanelFormattingSlice | undefined {
	return (spec.plugin.spec as { formatting?: PanelFormattingSlice }).formatting;
}

/** Merges a partial formatting patch into the panel's `formatting` slice. */
export function writeFormatting(
	spec: DashboardtypesPanelSpecDTO,
	patch: Partial<PanelFormattingSlice>,
): DashboardtypesPanelSpecDTO {
	const pluginSpec = spec.plugin.spec as { formatting?: PanelFormattingSlice };
	return {
		...spec,
		plugin: {
			...spec.plugin,
			spec: { ...pluginSpec, formatting: { ...pluginSpec.formatting, ...patch } },
		},
	} as DashboardtypesPanelSpecDTO;
}
