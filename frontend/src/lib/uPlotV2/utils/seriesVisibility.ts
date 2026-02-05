export function resolveSeriesVisibility(
	label: string,
	seriesShow: boolean | undefined | null,
	visibilityMap: Map<string, boolean> | null,
	isAnySeriesHidden: boolean,
): boolean {
	if (isAnySeriesHidden) {
		return visibilityMap?.get(label) ?? false;
	}
	return seriesShow ?? true;
}
