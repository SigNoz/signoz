import { type ComponentProps, useState } from 'react';
import { prepareGeoMapData } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/utils/prepareData';
import type { GeoMapPlacement } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';
import type { PanelTableColumn } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { initialQueriesMap } from 'constants/queryBuilder';
import { render, screen, userEvent, within } from 'tests/test-utils';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import type { QueryBuilderContextType } from 'types/common/queryBuilder';

import LocationSection from '../LocationSection';

type OnChange = ComponentProps<typeof LocationSection>['onChange'];

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

const TABLE_COLUMNS = [
	{ key: 'A', label: 'A', name: 'count()' },
	{ key: 'B', label: 'B', name: 'error_rate' },
];

function placementFor(
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

function renderSection(
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

const TRACES_QUERY = initialQueriesMap.traces;

function queryBuilderWith(query: Query): {
	overrides: Partial<QueryBuilderContextType>;
	redirect: jest.Mock;
} {
	const redirect = jest.fn();
	return {
		overrides: {
			currentQuery: query,
			redirectWithQueryBuilderData: redirect,
		},
		redirect,
	};
}

const groupByKeys = (redirect: jest.Mock): string[][] =>
	(redirect.mock.lastCall[0] as Query).builder.queryData.map((data) =>
		data.groupBy.map((item) => item.key),
	);

const COUNTRY_ROWS = [
	{ 'geo.country.iso_code': 'US', A: 10, B: 1 },
	{ 'geo.country.iso_code': 'DE', A: 5, B: 2 },
	{ 'geo.country.iso_code': 'ZZ', A: 1, B: 3 },
];

describe('LocationSection', () => {
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

	it('names what auto detected and how many rows it placed', async () => {
		renderSection(['geo.country.iso_code'], COUNTRY_ROWS);

		expect(
			screen.getByTestId('panel-editor-v2-geo-location-kind-country'),
		).toHaveTextContent('AUTO');
		expect(
			screen.getByText('Auto-detected from geo.country.iso_code.'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-geo-location-country'),
		).toHaveTextContent('Auto · geo.country.iso_code');
		expect(screen.getByTestId('geo-location-status')).toHaveTextContent(
			'2 of 3 rows placed',
		);

		await userEvent.click(screen.getByTestId('geo-location-show-unplaced'));
		expect(screen.getByTestId('geo-location-unplaced')).toHaveTextContent('ZZ');
	});

	it('asks for the country when states are picked, and hides the area', async () => {
		const onChange = renderSection(['geo.country.iso_code'], COUNTRY_ROWS, {
			map: {
				view: 'europe',
				projection: 'equal_earth',
			} as GeoMapPlacementSlice['map'],
		});

		await userEvent.click(screen.getByRole('radio', { name: 'State' }));

		expect(onChange).toHaveBeenLastCalledWith({
			location: { mode: 'subdivision', countryFormat: 'auto' },
			map: {
				view: 'country',
				viewCountry: 'US',
				layer: 'regions',
				projection: 'equal_earth',
			},
		});
		expect(
			screen.getByTestId('panel-editor-v2-geo-location-view-country'),
		).toHaveTextContent('United States · US');
		expect(
			screen.queryByTestId('panel-editor-v2-geo-map-view'),
		).not.toBeInTheDocument();

		await userEvent.click(
			screen.getByTestId('panel-editor-v2-geo-location-auto'),
		);
		expect(onChange).toHaveBeenLastCalledWith(
			expect.objectContaining({
				map: { view: 'europe', layer: 'regions', projection: 'equal_earth' },
			}),
		);
	});

	it('draws lat/lon rows as points, with no other layer to pick', () => {
		renderSection(
			['geo.location.lat', 'geo.location.lon'],
			[{ 'geo.location.lat': 1, 'geo.location.lon': 2, A: 1, B: 1 }],
		);

		expect(
			screen.getByTestId('panel-editor-v2-geo-location-kind-point'),
		).toHaveTextContent('AUTO');
		expect(
			screen.queryByTestId('panel-editor-v2-geo-map-layer'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('geo-location-points-requirement'),
		).not.toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-geo-location-lat'),
		).toHaveTextContent('Auto · geo.location.lat');
		expect(screen.getByText('Point size')).toBeInTheDocument();
	});

	it('starts on Mercator and switches the projection', async () => {
		const onChange = renderSection(['geo.country.iso_code'], COUNTRY_ROWS);
		const tile = (projection: string): HTMLElement =>
			within(
				screen.getByTestId(`panel-editor-v2-geo-map-projection-${projection}`),
			).getByRole('radio');

		expect(tile('mercator')).toBeChecked();
		expect(
			screen.getByTestId('panel-editor-v2-geo-map-projection-equal_earth'),
		).toHaveTextContent('Equal EarthTrue areas');

		await userEvent.click(tile('equal_earth'));

		expect(onChange).toHaveBeenLastCalledWith({
			map: { layer: 'regions', view: 'world', projection: 'equal_earth' },
		});
		expect(tile('equal_earth')).toBeChecked();
		expect(
			screen.getByText('Draws every country at its true size.'),
		).toBeInTheDocument();
	});

	it('lists the steps when point rows lack lat/lon columns', async () => {
		const onChange = renderSection(['geo.country.iso_code'], COUNTRY_ROWS);

		await userEvent.click(
			within(
				screen.getByTestId('panel-editor-v2-geo-location-kind-point'),
			).getByRole('radio'),
		);

		expect(onChange).toHaveBeenLastCalledWith({
			location: { mode: 'coordinates', countryFormat: 'auto' },
			map: { layer: 'points', view: 'world', projection: 'mercator' },
		});
		const requirement = screen.getByTestId('geo-location-points-requirement');
		expect(requirement).toHaveTextContent(
			'Add geo.location.lat and geo.location.lon to Group By.',
		);
		expect(screen.getByTestId('geo-location-points-use-areas')).toHaveTextContent(
			'Use geo.country.iso_code',
		);
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

	it('brings back the rows and layer drawn before points', async () => {
		const onChange = renderSection(['geo.country.iso_code'], COUNTRY_ROWS, {
			map: { layer: 'bubbles' } as GeoMapPlacementSlice['map'],
		});

		await userEvent.click(
			within(
				screen.getByTestId('panel-editor-v2-geo-location-kind-point'),
			).getByRole('radio'),
		);
		await userEvent.click(screen.getByTestId('geo-location-points-use-areas'));

		expect(onChange).toHaveBeenLastCalledWith({
			location: {
				mode: 'auto',
				countryFormat: 'auto',
				country: '',
				region: '',
				lat: '',
				lon: '',
			},
			map: { layer: 'bubbles', view: 'world', projection: 'mercator' },
		});
		expect(
			within(
				screen.getByTestId('panel-editor-v2-geo-map-layer-bubbles'),
			).getByRole('radio'),
		).toBeChecked();
		expect(
			screen.queryByTestId('geo-location-points-requirement'),
		).not.toBeInTheDocument();
	});

	it('flags a configured column the results lack and offers the detected one', async () => {
		const onChange = renderSection(
			['geo.country.iso_code', 'service.name'],
			COUNTRY_ROWS,
			{
				location: {
					mode: 'country',
					country: 'geo.country.name',
				} as GeoMapPlacementSlice['location'],
			},
		);

		expect(
			screen.getByText(/geo.country.name isn't in the query results/),
		).toBeInTheDocument();

		await userEvent.click(
			screen.getByTestId('panel-editor-v2-geo-location-country-fix'),
		);
		expect(onChange).toHaveBeenLastCalledWith({
			location: { mode: 'country', countryFormat: 'auto', country: '' },
		});
	});

	it('says what color and size each show', () => {
		renderSection(['geo.country.iso_code'], COUNTRY_ROWS, {
			map: {
				layer: 'bubbles',
				colorBy: 'B',
				sizeBy: 'A',
			} as GeoMapPlacementSlice['map'],
		});

		expect(screen.getByText('Bubble size')).toBeInTheDocument();
		expect(
			screen.getByText('Color shows B · error_rate, size shows A · count().'),
		).toBeInTheDocument();
		expect(
			within(screen.getByTestId('panel-editor-v2-geo-map-color-by')).getByText(
				'B · error_rate',
			),
		).toBeInTheDocument();
	});
});
