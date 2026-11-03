import { DashboardtypesGeoMapLayerDTO } from 'api/generated/services/sigNoz.schemas';

import { LocationKind } from '../../types';
import {
	countryTable,
	group,
	locationOf,
	makeTable,
	mapOf,
	prepare,
	value,
} from './prepareGeoMapFixtures';

describe('prepareGeoMapData', () => {
	describe('coordinates', () => {
		const pointTable = makeTable(
			[
				group('geo.locality.name'),
				group('geo.location.lat'),
				group('geo.location.lon'),
				value('A'),
				value('B'),
			],
			[
				{
					'geo.locality.name': 'Paris',
					'geo.location.lat': '48.86',
					'geo.location.lon': 2.35,
					A: 9,
					B: 1,
				},
				{
					'geo.locality.name': '',
					'geo.location.lat': 35.68,
					'geo.location.lon': 139.69,
					A: 4,
					B: 2,
				},
				{
					'geo.locality.name': 'Nowhere',
					'geo.location.lat': 120,
					'geo.location.lon': 0,
					A: 1,
					B: 3,
				},
			],
		);

		it('draws points labelled by the other group values', () => {
			const data = prepare(pointTable, { map: mapOf({ sizeBy: 'B' }) });

			expect(data.location?.kind).toBe(LocationKind.Coordinates);
			expect(data.layer).toBe('points');
			expect(data.points).toStrictEqual([
				{ id: '0', lat: 48.86, lon: 2.35, value: 9, size: 1, label: 'Paris' },
				{
					id: '1',
					lat: 35.68,
					lon: 139.69,
					value: 4,
					size: 2,
					label: '',
				},
			]);
			expect(data.unmapped).toStrictEqual([{ raw: '120, 0', rows: 1 }]);
		});

		it('counts a row with no coordinates as having no location', () => {
			const data = prepare(
				makeTable(
					[group('geo.location.lat'), group('geo.location.lon'), value('A')],
					[{ 'geo.location.lat': '', 'geo.location.lon': '', A: 1 }],
				),
			);

			expect(data.unmapped).toStrictEqual([{ raw: '', rows: 1 }]);
		});

		it('draws bubbles when points are asked for without coordinates', () => {
			const data = prepare(countryTable, {
				map: mapOf({ layer: DashboardtypesGeoMapLayerDTO.points }),
			});

			expect(data.layer).toBe('bubbles');
			expect(data.pointsWithoutCoordinates).toBe(true);
		});

		it('reads numeric SQL coordinates, detected or bound, as the location', () => {
			const sqlTable = makeTable(
				[
					value('latitude'),
					value('longitude'),
					value('x'),
					value('y'),
					value('hits'),
				],
				[{ latitude: 48.86, longitude: 2.35, x: 2.35, y: 48.86, hits: 9 }],
			);
			const detected = prepare(sqlTable);
			const bound = prepare(sqlTable, {
				location: locationOf({ lat: 'y', lon: 'x' }),
			});

			expect(detected.location?.kind).toBe(LocationKind.Coordinates);
			expect(detected.points).toHaveLength(1);
			expect(detected.colorColumn?.id).toBe('x');
			expect(bound.points).toHaveLength(1);
			expect(bound.colorColumn?.id).toBe('latitude');
		});
	});
});
