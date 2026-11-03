import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { screen, userEvent } from 'tests/test-utils';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import {
	COUNTRY_ROWS,
	groupByKeys,
	queryBuilderWith,
	renderSection,
	TRACES_QUERY,
} from './renderLocationSection';

describe('LocationSection Group By shortcuts', () => {
	it('asks for a location group by before there is one', () => {
		renderSection([], []);

		expect(screen.getByTestId('geo-location-empty')).toHaveTextContent(
			'Add a location to Group By',
		);
		expect(screen.getByText('Nothing to detect yet.')).toBeInTheDocument();
	});

	it('adds a suggested location to Group By and runs the query', async () => {
		const query: Query = {
			...TRACES_QUERY,
			builder: {
				...TRACES_QUERY.builder,
				queryData: TRACES_QUERY.builder.queryData.map((data) => ({
					...data,
					groupBy: [{ key: 'service.name', type: '' }],
				})),
			},
		};
		const { overrides, redirect } = queryBuilderWith(query);
		renderSection([], [], {}, overrides);

		await userEvent.click(
			screen.getByTestId('geo-location-add-group-by-geo.location.lat'),
		);

		expect(groupByKeys(redirect)).toStrictEqual([
			['service.name', 'geo.location.lat', 'geo.location.lon'],
		]);
	});

	it('only names the keys when the query is not a builder query', () => {
		const { overrides } = queryBuilderWith({
			...TRACES_QUERY,
			queryType: EQueryType.CLICKHOUSE,
		});
		renderSection([], [], {}, overrides);

		expect(screen.getByTestId('geo-location-empty')).toHaveTextContent(
			'geo.country.iso_code',
		);
		expect(
			screen.queryByTestId('geo-location-add-group-by-geo.country.iso_code'),
		).not.toBeInTheDocument();
	});

	it('adds the missing lat/lon to Group By from the points steps', async () => {
		const { overrides, redirect } = queryBuilderWith(TRACES_QUERY);
		renderSection(
			['geo.country.iso_code', 'geo.location.lat'],
			COUNTRY_ROWS,
			{ location: { mode: 'coordinates' } as GeoMapPlacementSlice['location'] },
			overrides,
		);

		expect(
			screen.getByTestId('geo-location-points-requirement'),
		).toHaveTextContent('Add geo.location.lon to Group By.');

		await userEvent.click(screen.getByTestId('geo-location-points-add-group-by'));

		expect(groupByKeys(redirect)).toStrictEqual([['geo.location.lon']]);
	});
});
