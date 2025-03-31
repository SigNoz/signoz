/**
 * Check if the inspect feature flag is enabled
 * returns true if the feature flag is enabled, false otherwise
 * Show the inspect button in  metrics explorer if the feature flag is enabled
 */
export function isInspectEnabled(): boolean {
	const featureFlag = localStorage.getItem(
		'metrics-explorer-inspect-feature-flag',
	);
	return featureFlag === 'true';
}
