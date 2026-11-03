import { type ComponentProps, useState } from 'react';
import { prepareGeoMapData } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/utils/prepareData';
import type { GeoMapPlacement } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';
import type { PanelTableColumn } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { initialQueriesMap } from 'constants/queryBuilder';
import { render } from 'tests/test-utils';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import type { QueryBuilderContextType } from 'types/common/queryBuilder';

import LocationSection from '../LocationSection';

type OnChange = ComponentProps<typeof LocationSection>['onChange'];
type Redirect = jest.MockedFunction<
	QueryBuilderContextType['redirectWithQueryBuilderData']
>;

const group = (id: string): PanelTableColumn => ({
	id,
	name: id,
	queryName: '',
	isValueColumn: false,
});
const value = (id: string, name: string): PanelTableColumn => ({
	id,
	name,
	queryName: id,
	isValueColumn: true,
});

export const TABLE_COLUMNS = [
	{ key: 'A', label: 'A', name: 'count()' },
	{ key: 'B', label: 'B', name: 'error_rate' },
];

export function placementFor(
	groups: string[],
	rows: Record<string, unknown>[],
	slice: GeoMapPlacementSlice = {},
): GeoMapPlacement {
	return {
		data: prepareGeoMapData({
			table: {
				queryName: 'A',
				legend: '',
				columns: [
					...groups.map(group),
					value('A', 'count()'),
					value('B', 'error_rate'),
				],
				rows: rows.map((data) => ({ data })),
			},
			location: slice.location,
			map: slice.map,
			scale: ColorRampScale.Log,
			subdivisions: null,
		}),
		suggestedCountry: 'US',
	};
}

export function renderSection(
	groups: string[],
	rows: Record<string, unknown>[],
	initial: GeoMapPlacementSlice = {},
	queryBuilderOverrides?: Partial<QueryBuilderContextType>,
): jest.MockedFunction<OnChange> {
	const onChange = jest.fn() as jest.MockedFunction<OnChange>;
	function Stateful(): JSX.Element {
		const [slice, setSlice] = useState(initial);
		return (
			<LocationSection
				value={slice}
				groupColumns={groups}
				tableColumns={TABLE_COLUMNS}
				geoMapPlacement={placementFor(groups, rows, slice)}
				onChange={(next): void => {
					setSlice(next);
					onChange(next);
				}}
			/>
		);
	}
	render(<Stateful />, undefined, { queryBuilderOverrides });
	return onChange;
}

export const TRACES_QUERY = initialQueriesMap.traces;

export function queryBuilderWith(query: Query): {
	overrides: Partial<QueryBuilderContextType>;
	redirect: Redirect;
} {
	const redirect = jest.fn() as Redirect;
	return {
		overrides: {
			currentQuery: query,
			redirectWithQueryBuilderData: redirect,
		},
		redirect,
	};
}

export function groupByKeys(redirect: Redirect): string[][] {
	const [query] = redirect.mock.lastCall ?? [];
	return (query as Query).builder.queryData.map((data) =>
		data.groupBy.map((item) => item.key),
	);
}

export const COUNTRY_ROWS = [
	{ 'geo.country.iso_code': 'US', A: 10, B: 1 },
	{ 'geo.country.iso_code': 'DE', A: 5, B: 2 },
	{ 'geo.country.iso_code': 'ZZ', A: 1, B: 3 },
];
