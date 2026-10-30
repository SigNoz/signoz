import { PANEL_TYPES } from 'constants/queryBuilder';

/** Panels that reduce each query to one value per group over the whole window. */
const SCALAR_PANEL_TYPES: ReadonlySet<string> = new Set<string>([
	PANEL_TYPES.TABLE,
	PANEL_TYPES.SCATTER,
	PANEL_TYPES.PIE,
	PANEL_TYPES.VALUE,
]);

export function isScalarPanelType(panelType?: string | null): boolean {
	return panelType != null && SCALAR_PANEL_TYPES.has(panelType);
}
