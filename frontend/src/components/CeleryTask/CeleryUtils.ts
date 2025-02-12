import { QueryParams } from 'constants/query';
import { History, Location } from 'history';
import getRenderer from 'lib/uPlotLib/utils/getRenderer';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuidv4 } from 'uuid';

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
	history: History<unknown>,
	location: Location<unknown>,
	queryParams: QueryParams,
): void {
	urlQuery.set(queryParams, value.join(','));
	const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
	history.replace(generatedUrl);
}

export function getFiltersFromQueryParams(
	queryParams: QueryParams,
	urlQuery: URLSearchParams,
	key: string,
): TagFilterItem[] {
	const value = urlQuery.get(queryParams);
	const filters = value ? value.split(',') : [];
	return filters.map((value) => ({
		id: uuidv4(),
		key: {
			key,
			dataType: DataTypes.String,
			type: 'tag',
			isColumn: false,
			isJSON: false,
			id: `${key}--string--tag--false`,
		},
		op: '=',
		value: value.toString(),
	}));
}

export function applyCeleryFilterOnWidgetData(
	filters: TagFilterItem[],
	widgetData: Widgets,
): Widgets {
	return {
		...widgetData,
		query: {
			...widgetData.query,
			builder: {
				...widgetData.query.builder,
				queryData: widgetData.query.builder.queryData.map((queryItem, index) =>
					index === 0
						? {
								...queryItem,
								filters: {
									...queryItem.filters,
									items: [...queryItem.filters.items, ...filters],
								},
						  }
						: queryItem,
				),
			},
		},
	};
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

export const createFiltersFromData = (
	data: Record<string, any>,
): Array<{
	id: string;
	key: {
		key: string;
		dataType: DataTypes;
		type: string;
		isColumn: boolean;
		isJSON: boolean;
		id: string;
	};
	op: string;
	value: string;
}> => {
	const excludeKeys = ['A', 'A_without_unit'];

	return (
		Object.entries(data)
			.filter(([key]) => !excludeKeys.includes(key))
			// eslint-disable-next-line sonarjs/no-identical-functions
			.map(([key, value]) => ({
				id: uuidv4(),
				key: {
					key,
					dataType: DataTypes.String,
					type: 'tag',
					isColumn: false,
					isJSON: false,
					id: `${key}--string--tag--false`,
				},
				op: '=',
				value: value.toString(),
			}))
	);
};
