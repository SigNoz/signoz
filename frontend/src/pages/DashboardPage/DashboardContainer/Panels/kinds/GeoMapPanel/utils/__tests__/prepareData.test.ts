import {
	DashboardtypesGeoMapCountryFormatDTO,
	DashboardtypesGeoMapLayerDTO,
} from 'api/generated/services/sigNoz.schemas';

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
	it('detects the country column and colors by the first value column', () => {
		const data = prepare(countryTable);

		expect(data.location).toStrictEqual({
			kind: LocationKind.Country,
			country: countryTable.columns[0],
		});
		expect(data.colorColumn?.id).toBe('A');
		expect(data.layer).toBe('regions');
		expect(data.regions).toStrictEqual([
			{ code: 'US', value: 120, raw: 'US' },
			{ code: 'DE', value: 80, raw: 'deu' },
			{ code: 'FR', value: 40, raw: 'France' },
		]);
		expect(data.rowIndexById.get('DE')).toBe(1);
	});

	it('sizes by a second column and keeps a missing size as null', () => {
		const data = prepare(countryTable, {
			map: mapOf({ colorBy: 'B', sizeBy: 'A' }),
		});

		expect(data.colorColumn?.id).toBe('B');
		expect(data.regions.map((datum) => [datum.value, datum.size])).toStrictEqual([
			[4, 120],
			[2, 80],
		]);
		expect(data.missingValueRows).toBe(1);
	});

	it('leaves out bubbles without a positive size', () => {
		const data = prepare(countryTable, {
			map: mapOf({
				layer: DashboardtypesGeoMapLayerDTO.bubbles,
				colorBy: 'A',
				sizeBy: 'B',
			}),
		});

		expect(data.regions.map((datum) => datum.code)).toStrictEqual(['US', 'DE']);
		expect(data.missingSizeRows).toBe(1);
	});

	it('reads country values only in the declared format', () => {
		const data = prepare(countryTable, {
			location: locationOf({
				countryFormat: DashboardtypesGeoMapCountryFormatDTO.alpha2,
			}),
		});

		expect(data.regions.map((datum) => datum.code)).toStrictEqual(['US']);
		expect(data.unmapped).toStrictEqual([
			{ raw: 'deu', rows: 1 },
			{ raw: 'France', rows: 1 },
		]);
	});

	it('keeps the first row of a repeated location and counts unknown values', () => {
		const data = prepare(
			makeTable(
				[group('country'), value('A')],
				[
					{ country: 'US', A: 1 },
					{ country: 'USA', A: 2 },
					{ country: 'ZZ', A: 3 },
					{ country: 'ZZ', A: 4 },
					{ country: '', A: 5 },
				],
			),
		);

		expect(data.regions).toStrictEqual([{ code: 'US', value: 1, raw: 'US' }]);
		expect(data.duplicateRows).toBe(1);
		expect(data.unmapped).toStrictEqual([
			{ raw: 'ZZ', rows: 2 },
			{ raw: '', rows: 1 },
		]);
		expect(data.unmappedRows).toBe(3);
	});
});
