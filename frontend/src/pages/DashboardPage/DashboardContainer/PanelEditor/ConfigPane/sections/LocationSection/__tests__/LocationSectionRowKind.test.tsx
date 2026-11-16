import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { screen, userEvent } from 'tests/test-utils';

import { COUNTRY_ROWS, renderSection } from './renderLocationSection';

describe('LocationSection row kind', () => {
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
});
