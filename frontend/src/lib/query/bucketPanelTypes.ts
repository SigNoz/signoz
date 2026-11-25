import { PANEL_TYPES } from 'constants/queryBuilder';

/**
 * Panel types whose request counts observations into buckets (`heatmap`,
 * `distribution`): they share the bucket axis, its query-builder options and the
 * count aggregation a histogram metric gets.
 */
export function isBucketPanelType(
	panelType: string | null | undefined,
): boolean {
	return (
		panelType === PANEL_TYPES.HEATMAP || panelType === PANEL_TYPES.DISTRIBUTION
	);
}
