import { SeriesVisibilityState } from 'container/DashboardContainer/visualization/panels/types';

export function resolveSeriesVisibility({
	seriesIndex,
	seriesShow,
	seriesLabel,
	seriesVisibilityState,
	isAnySeriesHidden,
}: {
	seriesIndex: number;
	seriesShow: boolean | undefined | null;
	seriesLabel: string;
	seriesVisibilityState: SeriesVisibilityState | null;
	isAnySeriesHidden: boolean;
}): boolean {
	if (
		isAnySeriesHidden &&
		seriesVisibilityState?.visibility &&
		seriesVisibilityState.lables.length > seriesIndex &&
		seriesVisibilityState.lables[seriesIndex] === seriesLabel
	) {
		return seriesVisibilityState.visibility[seriesIndex] ?? false;
	}
	return seriesShow ?? true;
}
