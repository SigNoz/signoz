/**
 * Resolve the visibility of a single series based on:
 * - Stored per-series visibility (when applicable)
 * - Whether there is an "active preference" (mix of visible/hidden that matches current series)
 * - The series' own default show flag
 */
export function resolveSeriesVisibility({
	seriesShow,
	seriesLabel,
	visibleStoredLabels,
	hiddenStoredLabels,
	hasActivePreference,
}: {
	seriesShow: boolean | undefined | null;
	seriesLabel: string;
	visibleStoredLabels: Set<string> | null;
	hiddenStoredLabels: Set<string> | null;
	hasActivePreference: boolean;
}): boolean {
	const isStoredVisible = !!visibleStoredLabels?.has(seriesLabel);
	const isStoredHidden = !!hiddenStoredLabels?.has(seriesLabel);

	// If the label is explicitly stored as visible, always show it.
	if (isStoredVisible) {
		return true;
	}

	// If the label is explicitly stored as hidden (and never stored as visible),
	// always hide it.
	if (isStoredHidden) {
		return false;
	}

	// "Active preference" means:
	// - There is a mix of visible/hidden in storage, AND
	// - At least one stored *visible* label exists in the current series list.
	// For such a preference, any new/unknown series should be hidden by default.
	if (hasActivePreference) {
		return false;
	}

	// Otherwise fall back to the series' own config or show by default.
	return seriesShow ?? true;
}
