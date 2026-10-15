import {
	DashboardtypesGeoMapCountryFormatDTO,
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapLocationModeDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { SubdivisionSet } from 'lib/visualization/charts/GeoMap/geo/subdivisions';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';
import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelThreshold } from '../../../types/threshold';
import { MAX_ROWS } from '../constants';
import { prepareGeoMapData } from '../prepareData';
import { LocationKind, type PrepareGeoMapDataArgs } from '../types';

const group = (id: string): PanelTableColumn => ({
	id,
	name: id,
	queryName: '',
	isValueColumn: false,
});

const value = (id: string): PanelTableColumn => ({
	id,
	name: id,
	queryName: id.split('.')[0],
	isValueColumn: true,
});

function makeTable(
	columns: PanelTableColumn[],
	rows: Record<string, unknown>[],
): PanelTable {
	return {
		queryName: 'A',
		legend: '',
		columns,
		rows: rows.map((data) => ({ data })),
	};
}

const US_STATES: SubdivisionSet = {
	country: 'US',
	shapes: [],
	codes: new Set(['US-CA', 'US-NY']),
	aliases: {},
	names: { california: 'US-CA' },
};

function prepare(
	table: PanelTable,
	overrides: Partial<PrepareGeoMapDataArgs> = {},
): ReturnType<typeof prepareGeoMapData> {
	return prepareGeoMapData({
		table,
		location: undefined,
		map: undefined,
		scale: ColorRampScale.Linear,
		subdivisions: null,
		...overrides,
	});
}

const countryTable = makeTable(
	[group('geo.country.iso_code'), value('A'), value('B')],
	[
		{ 'geo.country.iso_code': 'US', A: 120, B: 4 },
		{ 'geo.country.iso_code': 'deu', A: 80, B: 2 },
		{ 'geo.country.iso_code': 'France', A: 40, B: 'n/a' },
	],
);

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
		const data = prepare(countryTable, { map: { colorBy: 'B', sizeBy: 'A' } });

		expect(data.colorColumn?.id).toBe('B');
		expect(data.regions.map((datum) => [datum.value, datum.size])).toStrictEqual([
			[4, 120],
			[2, 80],
		]);
		expect(data.missingValueRows).toBe(1);
	});

	it('reads country values only in the declared format', () => {
		const data = prepare(countryTable, {
			location: { countryFormat: DashboardtypesGeoMapCountryFormatDTO.alpha2 },
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

	it('falls back to the first group column when nothing is recognised', () => {
		const data = prepare(
			makeTable([group('client'), value('A')], [{ client: 'JP', A: 1 }]),
		);

		expect(data.regions).toStrictEqual([{ code: 'JP', value: 1, raw: 'JP' }]);
	});

	it('has no location without a group by', () => {
		const data = prepare(makeTable([value('A')], [{ A: 1 }]));

		expect(data.location).toBeNull();
		expect(data.regions).toStrictEqual([]);
	});

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
		const countryView = {
			view: DashboardtypesGeoMapViewDTO.country,
			viewCountry: 'US',
		};

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
				location: { mode: DashboardtypesGeoMapLocationModeDTO.subdivision },
			});

			expect(data.needsCountryView).toBe(true);
			expect(data.regions).toStrictEqual([]);
		});

		it('draws nothing while the states file loads', () => {
			const data = prepare(statesTable, { map: countryView });

			expect(data.needsCountryView).toBe(false);
			expect(data.regions).toStrictEqual([]);
		});
	});

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
			const data = prepare(pointTable, { map: { sizeBy: 'B' } });

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

		it('draws bubbles when points are asked for without coordinates', () => {
			const data = prepare(countryTable, {
				map: { layer: DashboardtypesGeoMapLayerDTO.points },
			});

			expect(data.layer).toBe('bubbles');
			expect(data.pointsWithoutCoordinates).toBe(true);
		});
	});

	it('names spec columns missing from the result and falls back', () => {
		const data = prepare(countryTable, {
			location: { country: 'client.country' },
			map: { colorBy: 'F1', sizeBy: 'B' },
		});

		expect(data.staleBindings).toStrictEqual([
			{ field: 'country', key: 'client.country' },
			{ field: 'colorBy', key: 'F1' },
		]);
		expect(data.colorColumn?.id).toBe('A');
		expect(data.regions).toHaveLength(3);
	});

	it('counts values the log scale cannot separate', () => {
		const data = prepare(
			makeTable(
				[group('country'), value('A')],
				[
					{ country: 'US', A: 0 },
					{ country: 'DE', A: -2 },
					{ country: 'FR', A: 5 },
				],
			),
			{ scale: ColorRampScale.Log },
		);

		expect(data.nonPositiveOnLogRows).toBe(2);
	});

	it('flags a result that reached the row limit', () => {
		const rows = Array.from({ length: MAX_ROWS }, () => ({
			country: 'US',
			A: 1,
		}));

		expect(
			prepare(makeTable([group('country'), value('A')], rows)).atRowLimit,
		).toBe(true);
	});

	describe('thresholds', () => {
		const above = (
			value: number,
			color: string,
			unit?: string,
		): PanelThreshold => ({
			operator: '>',
			value,
			color,
			unit,
		});

		it('colors a matching location and leaves the rest to the palette', () => {
			const data = prepare(countryTable, { thresholds: [above(100, 'red')] });

			expect(data.regions.map((datum) => datum.color)).toStrictEqual([
				'red',
				undefined,
				undefined,
			]);
		});

		it('takes the first match and counts the conflict', () => {
			const data = prepare(countryTable, {
				thresholds: [above(50, 'amber'), above(100, 'red')],
			});

			expect(data.regions.map((datum) => datum.color)).toStrictEqual([
				'amber',
				'amber',
				undefined,
			]);
			expect(data.thresholdConflictRows).toBe(1);
		});

		it('compares in the threshold unit', () => {
			const data = prepare(
				makeTable([group('country'), value('A')], [{ country: 'US', A: 1500 }]),
				{
					thresholds: [above(1, 'red', 's')],
					columnUnits: { A: 'ms' },
				},
			);

			expect(data.regions[0].color).toBe('red');
		});

		it('colors points too', () => {
			const data = prepare(
				makeTable(
					[group('lat'), group('lon'), value('A')],
					[{ lat: 1, lon: 2, A: 9 }],
				),
				{ thresholds: [above(5, 'red')] },
			);

			expect(data.points[0].color).toBe('red');
		});
	});
});
