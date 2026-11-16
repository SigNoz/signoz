import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { screen, userEvent, within } from 'tests/test-utils';

import { COUNTRY_ROWS, renderSection } from './renderLocationSection';

describe('LocationSection', () => {
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

	it('keeps auto-detected points when the map area frames a country', async () => {
		const user = userEvent.setup();
		const onChange = renderSection(
			['geo.location.lat', 'geo.location.lon', 'geo.region.iso_code'],
			[
				{
					'geo.location.lat': 52.5,
					'geo.location.lon': 13.4,
					'geo.region.iso_code': 'BE',
					A: 1,
					B: 1,
				},
			],
		);
		const area = screen.getByTestId('panel-editor-v2-geo-map-view');

		await user.type(within(area).getByRole('combobox'), 'Germany');
		await user.click(await screen.findByRole('option', { name: 'Germany' }));

		expect(onChange).toHaveBeenLastCalledWith({
			map: {
				layer: 'points',
				view: 'country',
				viewCountry: 'DE',
				projection: 'mercator',
			},
		});
		expect(
			screen.getByTestId('panel-editor-v2-geo-location-kind-point'),
		).toHaveTextContent('AUTO');
	});
});
