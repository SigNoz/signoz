import {
	DashboardtypesGeoMapLocationModeDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';

import { LocationKind } from '../../types';
import {
	group,
	locationOf,
	makeTable,
	mapOf,
	prepare,
	US_STATES,
	value,
} from './prepareGeoMapFixtures';

describe('prepareGeoMapData', () => {
	describe('subdivisions', () => {
		const statesTable = makeTable(
			[group('geo.country.iso_code'), group('geo.region.iso_code'), value('A')],
			[
				{ 'geo.country.iso_code': 'US', 'geo.region.iso_code': 'CA', A: 10 },
				{
					'geo.country.iso_code': 'US',
					'geo.region.iso_code': 'California',
					A: 11,
				},
				{ 'geo.country.iso_code': 'US', 'geo.region.iso_code': 'NY', A: 7 },
				{ 'geo.country.iso_code': 'FR', 'geo.region.iso_code': '75', A: 3 },
				{ 'geo.country.iso_code': 'US', 'geo.region.iso_code': 'XX', A: 1 },
			],
		);
		const countryView = mapOf({
			view: DashboardtypesGeoMapViewDTO.country,
			viewCountry: 'US',
		});

		it('places regions on a country view and counts other countries apart', () => {
			const data = prepare(statesTable, {
				map: countryView,
				subdivisions: US_STATES,
			});

			expect(data.location?.kind).toBe(LocationKind.Subdivision);
			expect(data.regions.map((datum) => datum.code)).toStrictEqual([
				'US-CA',
				'US-NY',
			]);
			expect(data.duplicateRows).toBe(1);
			expect(data.otherCountryRows).toBe(1);
			expect(data.unmapped).toStrictEqual([{ raw: 'XX', rows: 1 }]);
		});

		it('maps countries on a world view in auto mode', () => {
			const data = prepare(statesTable);

			expect(data.location?.kind).toBe(LocationKind.Country);
		});

		it('waits for a country view when the mode asks for states', () => {
			const data = prepare(statesTable, {
				location: locationOf({
					mode: DashboardtypesGeoMapLocationModeDTO.subdivision,
				}),
			});

			expect(data.needsCountryView).toBe(true);
			expect(data.regions).toStrictEqual([]);
		});

		it.each([undefined, '', 'ZZ'])(
			'asks for a country view when the view country is %p',
			(viewCountry) => {
				const data = prepare(statesTable, {
					location: locationOf({
						mode: DashboardtypesGeoMapLocationModeDTO.subdivision,
					}),
					map: mapOf({ view: DashboardtypesGeoMapViewDTO.country, viewCountry }),
				});

				expect(data.needsCountryView).toBe(true);
			},
		);

		it('draws nothing while the states file loads', () => {
			const data = prepare(statesTable, { map: countryView });

			expect(data.needsCountryView).toBe(false);
			expect(data.regions).toStrictEqual([]);
		});
	});
});
