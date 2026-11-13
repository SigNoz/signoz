import { QueryParams } from 'constants/query';
import type { AppLocation, NavigateFn } from 'lib/router/types';
import getRenderer from 'lib/uPlotLib/utils/getRenderer';

export function getValuesFromQueryParams(
	queryParams: QueryParams,
	urlQuery: URLSearchParams,
): string[] {
	const value = urlQuery.get(queryParams);
	return value ? value.split(',') : [];
}

export function setQueryParamsFromOptions(
	value: string[],
	urlQuery: URLSearchParams,
	navigate: NavigateFn,
	location: AppLocation,
	queryParams: QueryParams,
): void {
	urlQuery.set(queryParams, value.join(','));
	const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
	navigate(generatedUrl, { replace: true });
}

export const paths = (
	u: any,
	seriesIdx: number,
	idx0: number,
	idx1: number,
	extendGap: boolean,
	buildClip: boolean,
): uPlot.Series.PathBuilder => {
	const s = u.series[seriesIdx];
	const style = s.drawStyle;
	const interp = s.lineInterpolation;

	const renderer = getRenderer(style, interp);

	return renderer(u, seriesIdx, idx0, idx1, extendGap, buildClip);
};
