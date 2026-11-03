import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { screen, userEvent, within } from 'tests/test-utils';

import { COUNTRY_ROWS, renderSection } from './renderLocationSection';

describe('LocationSection points', () => {
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
});
