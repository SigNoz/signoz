import type {
	DashboardtypesPanelDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';
import { rememberSubdivisions } from 'lib/visualization/charts/GeoMap/geo/subdivisionCache';
import type {
	PanelQueryData,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { type GeoMapPanelData, LocationKind } from '../types';
import {
	getGeoMapDataWarning,
	getGeoMapEmptyMessage,
	getGeoMapWarning,
} from '../warnings';

const country: PanelTableColumn = {
	id: 'country',
	name: 'country',
	queryName: '',
	isValueColumn: false,
};
const count: PanelTableColumn = {
	id: 'A',
	name: 'count()',
	queryName: 'A',
	isValueColumn: true,
};

function makeData(overrides: Partial<GeoMapPanelData> = {}): GeoMapPanelData {
	return {
		location: { kind: LocationKind.Country, country },
		layer: 'regions',
		colorColumn: count,
		sizeColumn: undefined,
		regions: [{ code: 'US', value: 1, raw: 'US' }],
		points: [],
		rowIndexById: new Map([['US', 0]]),
		totalRows: 1,
		unmapped: [],
		unmappedRows: 0,
		otherCountryRows: 0,
		duplicateRows: 0,
		missingValueRows: 0,
		nonPositiveOnLogRows: 0,
		thresholdConflictRows: 0,
		atRowLimit: false,
		staleBindings: [],
		needsCountryView: false,
		pointsWithoutCoordinates: false,
		...overrides,
	};
}

describe('getGeoMapWarning', () => {
	it('says nothing when every row draws', () => {
		expect(getGeoMapWarning(makeData())).toBeNull();
	});

	it('counts rows left out and names the first unknown values', () => {
		const warning = getGeoMapWarning(
			makeData({
				totalRows: 10,
				unmapped: ['ZZ', 'A1', 'A2', 'EU', '-99', 'XX', ''].map((raw) => ({
					raw,
					rows: 1,
				})),
				unmappedRows: 7,
				duplicateRows: 2,
			}),
		);

		expect(warning).toStrictEqual({
			message: 'Showing 1 of 10 rows.',
			messages: [
				"7 rows with a location the map doesn't know: ZZ, A1, A2, EU, -99 and 1 more.",
				'2 rows repeat a location; the first row of each is shown.',
			],
		});
	});

	it('explains fallbacks when every row still draws', () => {
		const warning = getGeoMapWarning(
			makeData({
				staleBindings: [{ field: 'sizeBy', key: 'B' }],
				pointsWithoutCoordinates: true,
			}),
		);

		expect(warning?.message).toBe('Some map settings fall back.');
		expect(warning?.messages).toStrictEqual([
			"Size by uses B, which isn't in the results, so sizes follow the color value.",
			'Points need latitude and longitude columns, so locations are drawn as bubbles.',
		]);
	});

	it('names locations more than one threshold matches', () => {
		expect(
			getGeoMapWarning(makeData({ thresholdConflictRows: 2 }))?.messages,
		).toStrictEqual([
			'2 rows match more than one threshold; the first listed sets the color.',
		]);
	});

	it('warns at the row limit', () => {
		expect(
			getGeoMapWarning(makeData({ atRowLimit: true }))?.messages,
		).toStrictEqual([
			'The query stops at 10,000 rows. Add a filter to see the rest.',
		]);
	});

	it('leaves an empty map to the empty message', () => {
		expect(
			getGeoMapWarning(makeData({ regions: [], unmappedRows: 1 })),
		).toBeNull();
	});
});

describe('getGeoMapEmptyMessage', () => {
	it('asks for a location group by', () => {
		expect(
			getGeoMapEmptyMessage(makeData({ location: null, regions: [] }))?.title,
		).toBe('Group by a location');
	});

	it('asks for a country view for states', () => {
		expect(
			getGeoMapEmptyMessage(makeData({ needsCountryView: true, regions: [] }))
				?.title,
		).toBe('Pick a country view');
	});

	it('explains rows that place nowhere', () => {
		expect(
			getGeoMapEmptyMessage(
				makeData({
					regions: [],
					totalRows: 2,
					unmapped: [{ raw: 'ZZ', rows: 2 }],
					unmappedRows: 2,
				}),
			),
		).toStrictEqual({
			title: '0 of 2 rows placed',
			description: "2 rows with a location the map doesn't know: ZZ.",
		});
	});

	it('stays quiet when something draws or nothing came back', () => {
		expect(getGeoMapEmptyMessage(makeData())).toBeUndefined();
		expect(getGeoMapEmptyMessage(makeData({ totalRows: 0 }))).toBeUndefined();
	});
});

describe('getGeoMapDataWarning', () => {
	const panel = {
		kind: 'Panel',
		spec: {
			plugin: {
				kind: 'signoz/GeoMapPanel',
				spec: { map: { view: 'country', viewCountry: 'US' } },
			},
		},
	} as unknown as PanelOfKind<'signoz/GeoMapPanel'> & DashboardtypesPanelDTO;
	const data: PanelQueryData = {
		response: {
			status: 'success',
			data: {
				type: 'scalar',
				data: {
					results: [
						{
							queryName: 'A',
							columns: [
								{ name: 'geo.country.iso_code', queryName: '', columnType: 'group' },
								{ name: 'geo.region.iso_code', queryName: '', columnType: 'group' },
								{
									name: '__result_0',
									queryName: 'A',
									columnType: 'aggregation',
									aggregationIndex: 0,
								},
							],
							data: [
								['US', 'CA', 10],
								['FR', '75', 3],
							],
						},
					],
				},
			},
		} as unknown as QueryRangeV5200,
		requestPayload: undefined,
		legendMap: {},
	};

	it('places states once the map has loaded them', () => {
		rememberSubdivisions({
			country: 'US',
			shapes: [],
			codes: new Set(['US-CA']),
			aliases: {},
			names: {},
		});

		expect(getGeoMapDataWarning(panel, data)?.messages).toStrictEqual([
			'1 row from other countries, outside this view.',
		]);
	});
});
