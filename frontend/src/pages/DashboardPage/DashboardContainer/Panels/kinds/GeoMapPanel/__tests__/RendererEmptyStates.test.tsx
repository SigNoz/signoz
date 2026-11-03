import {
	DashboardtypesGeoMapCountryFormatDTO,
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapLocationModeDTO,
	DashboardtypesGeoMapProjectionDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import { rememberSubdivisions } from 'lib/visualization/charts/GeoMap/geo/subdivisionCache';
import { act, screen } from 'tests/test-utils';

import {
	dataWith,
	lastMapProps,
	loadBody,
	mapProps,
	renderPanel,
} from './renderGeoMapPanel';

describe('GeoMapPanelRenderer empty states', () => {
	beforeAll(loadBody);
	beforeEach(() => mapProps.mockClear());

	it('asks for a location group by', async () => {
		renderPanel(dataWith([], ['A'], [[5]]));

		await expect(
			screen.findByText('Group by a location'),
		).resolves.toBeInTheDocument();
		expect(mapProps).not.toHaveBeenCalled();
	});

	it('asks for a country view when state rows have no country to show', async () => {
		renderPanel(dataWith(['geo.region.iso_code'], ['A'], [['CA', 5]]), {
			location: {
				mode: DashboardtypesGeoMapLocationModeDTO.subdivision,
				countryFormat: DashboardtypesGeoMapCountryFormatDTO.auto,
			},
			map: {
				layer: DashboardtypesGeoMapLayerDTO.regions,
				view: DashboardtypesGeoMapViewDTO.country,
				projection: DashboardtypesGeoMapProjectionDTO.mercator,
			},
		});

		await expect(
			screen.findByText('Pick a country view'),
		).resolves.toBeInTheDocument();
		expect(mapProps).not.toHaveBeenCalled();
	});

	it('places state rows once the map has loaded their states', async () => {
		renderPanel(dataWith(['geo.region.iso_code'], ['A'], [['CA', 5]]), {
			location: {
				mode: DashboardtypesGeoMapLocationModeDTO.subdivision,
				countryFormat: DashboardtypesGeoMapCountryFormatDTO.auto,
			},
			map: {
				layer: DashboardtypesGeoMapLayerDTO.regions,
				view: DashboardtypesGeoMapViewDTO.country,
				viewCountry: 'US',
				projection: DashboardtypesGeoMapProjectionDTO.mercator,
			},
		});

		await screen.findByTestId('geo-map');
		expect(lastMapProps().data).toStrictEqual([]);

		// What the map's own load, or its retry after a failure, leaves behind.
		act(() =>
			rememberSubdivisions({
				country: 'US',
				shapes: [],
				codes: new Set(['US-CA']),
				aliases: {},
				names: {},
			}),
		);

		expect(lastMapProps().data).toStrictEqual([
			{ code: 'US-CA', value: 5, raw: 'CA' },
		]);
	});

	it('shows the plain empty state when the query returns nothing', async () => {
		renderPanel(dataWith(['geo.country.iso_code'], ['A'], []));

		await expect(
			screen.findByTestId('panel-no-data'),
		).resolves.toBeInTheDocument();
	});
});
