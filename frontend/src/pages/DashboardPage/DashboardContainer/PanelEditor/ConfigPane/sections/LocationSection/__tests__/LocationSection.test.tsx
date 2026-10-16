import { useState } from 'react';
import { prepareGeoMapData } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/prepareData';
import type { GeoMapPlacement } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';
import type { PanelTableColumn } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import { render, screen, userEvent, within } from 'tests/test-utils';

import LocationSection from '../LocationSection';

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
): jest.Mock {
	const onChange = jest.fn();
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
	render(<Stateful />);
	return onChange;
}

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
			location: { mode: 'subdivision' },
			map: { view: 'country', viewCountry: 'US', projection: 'equal_earth' },
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
				map: { view: 'europe', viewCountry: 'US', projection: 'equal_earth' },
			}),
		);
	});

	it('reads lat/lon rows as points and offers no other layer', () => {
		renderSection(
			['geo.location.lat', 'geo.location.lon'],
			[{ 'geo.location.lat': 1, 'geo.location.lon': 2, A: 1, B: 1 }],
		);

		expect(screen.getByRole('radio', { name: 'Points' })).toBeChecked();
		expect(screen.getByRole('radio', { name: 'Shaded areas' })).toBeDisabled();
		expect(screen.getByRole('radio', { name: 'Bubbles' })).toBeDisabled();
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
			map: { projection: 'equal_earth' },
		});
		expect(tile('equal_earth')).toBeChecked();
		expect(
			screen.getByText('Draws every country at its true size.'),
		).toBeInTheDocument();
	});

	it('switches to point rows when Points is drawn', async () => {
		const onChange = renderSection(['geo.country.iso_code'], COUNTRY_ROWS);

		await userEvent.click(screen.getByRole('radio', { name: 'Points' }));

		expect(onChange).toHaveBeenLastCalledWith({
			location: { mode: 'coordinates' },
			map: { layer: 'points', projection: 'mercator' },
		});
		expect(
			screen.getByText('Points need both columns; until then nothing is drawn.'),
		).toBeInTheDocument();
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
			location: { mode: 'country', country: '' },
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
