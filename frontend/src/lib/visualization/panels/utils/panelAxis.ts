import { PANEL_TYPES } from 'constants/queryBuilder';

/**
 * Whether the panel type plots time on X. Graph and bar do; the rest drawn through
 * `buildBaseConfig` — histogram buckets, billing categories — plot a value there instead.
 */
export function plotsTimeOnXAxis(panelType: PANEL_TYPES): boolean {
	return panelType === PANEL_TYPES.TIME_SERIES || panelType === PANEL_TYPES.BAR;
}
