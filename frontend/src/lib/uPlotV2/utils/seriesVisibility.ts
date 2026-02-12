export function resolveSeriesVisibility({
	seriesIndex,
	seriesShow,
	visibility,
	isAnySeriesHidden,
}: {
	seriesIndex: number;
	seriesShow: boolean | undefined | null;
	visibility: boolean[] | null;
	isAnySeriesHidden: boolean;
}): boolean {
	if (isAnySeriesHidden && visibility) {
		return visibility[seriesIndex] ?? false;
	}
	return seriesShow ?? true;
}
