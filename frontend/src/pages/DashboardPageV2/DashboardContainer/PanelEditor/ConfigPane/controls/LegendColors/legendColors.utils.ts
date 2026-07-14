import type { DashboardtypesLegendDTOCustomColors } from 'api/generated/services/sigNoz.schemas';

import type { LegendSeries } from '../../../utils/legendSeries';

/** Case-insensitive substring filter over series labels. Empty query → all series. */
export function filterLegendSeries(
	series: LegendSeries[],
	query: string,
): LegendSeries[] {
	const q = query.trim().toLowerCase();
	if (!q) {
		return series;
	}
	return series.filter((s) => s.label.toLowerCase().includes(q));
}

/** The effective color for a series: the override if set, else its auto color. */
export function resolveSeriesColor(
	value: DashboardtypesLegendDTOCustomColors | undefined,
	label: string,
	defaultColor: string,
): string {
	return value?.[label] ?? defaultColor;
}

/** Set an override for `label`, returning a new customColors record. */
export function setSeriesColor(
	value: DashboardtypesLegendDTOCustomColors | undefined,
	label: string,
	hex: string,
): Record<string, string> {
	return { ...value, [label]: hex };
}

/** Drop the override for `label` (revert to the auto color), returning a new record. */
export function clearSeriesColor(
	value: DashboardtypesLegendDTOCustomColors | undefined,
	label: string,
): Record<string, string> {
	const next = { ...value };
	delete next[label];
	return next;
}
