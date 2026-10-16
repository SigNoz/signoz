import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import {
	type GeoMapPanelData,
	LocationKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';

import {
	buildAreaItems,
	changeRowKind,
	describePlacement,
	describeUnplaced,
	fromAreaValue,
	resolveLayer,
	resolveRowKind,
	toAreaValue,
} from '../utils';

const column = (id: string): GeoMapPanelData['colorColumn'] & object => ({
	id,
	name: id,
	queryName: '',
	isValueColumn: false,
});

function makeData(overrides: Partial<GeoMapPanelData> = {}): GeoMapPanelData {
	return {
		location: {
			kind: LocationKind.Country,
			country: column('geo.country.iso_code'),
		},
		layer: 'regions',
		colorColumn: { ...column('A'), name: 'count()', isValueColumn: true },
		sizeColumn: undefined,
		regions: [],
		points: [],
		rowIndexById: new Map(),
		totalRows: 0,
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

describe('resolveRowKind', () => {
	it('reads the picked mode, else what the preview placed rows as', () => {
		expect(
			resolveRowKind(
				{ location: { mode: 'subdivision' } } as GeoMapPlacementSlice,
				undefined,
			),
		).toBe('state');
		expect(resolveRowKind(undefined, makeData())).toBe('country');
		expect(
			resolveRowKind(undefined, makeData({ location: null })),
		).toBeUndefined();
	});
});

describe('resolveLayer', () => {
	it('draws point rows as points and nothing else as points', () => {
		expect(
			resolveLayer({ map: { layer: 'bubbles' } } as GeoMapPlacementSlice, 'point'),
		).toBe('points');
		expect(
			resolveLayer(
				{ map: { layer: 'points' } } as GeoMapPlacementSlice,
				'country',
			),
		).toBe('regions');
	});
});

describe('changeRowKind', () => {
	it('sets the country view with the suggested country when picking states', () => {
		const change = changeRowKind(
			{
				map: { view: 'europe', layer: 'points', projection: 'equal_earth' },
			} as GeoMapPlacementSlice,
			'country',
			'state',
			{ suggestedCountry: 'US' },
		);

		expect(change.next).toStrictEqual({
			location: { mode: 'subdivision' },
			map: {
				view: 'country',
				viewCountry: 'US',
				layer: 'regions',
				projection: 'equal_earth',
			},
		});
		expect(change.previousView).toBe('europe');
	});

	it('opens states on the US when the rows suggest no country', () => {
		expect(
			changeRowKind(undefined, 'country', 'state', {}).next.map?.viewCountry,
		).toBe('US');
	});

	it('restores the area when leaving states', () => {
		const change = changeRowKind(
			{
				location: { mode: 'subdivision' },
				map: { view: 'country', viewCountry: 'US' },
			} as GeoMapPlacementSlice,
			'state',
			'country',
			{ previousView: 'europe' as never },
		);

		expect(change.next.map?.view).toBe('europe');
		expect(change.next.location?.mode).toBe('country');
	});

	it('draws points for point rows and clears columns going back to auto', () => {
		expect(changeRowKind(undefined, 'country', 'point', {}).next).toStrictEqual({
			location: { mode: 'coordinates' },
			map: { layer: 'points', projection: 'mercator' },
		});
		expect(
			changeRowKind(
				{ location: { mode: 'country', country: 'c' } } as GeoMapPlacementSlice,
				'country',
				'auto',
				{},
			).next.location,
		).toStrictEqual({ mode: 'auto', country: '', region: '', lat: '', lon: '' });
	});
});

describe('area', () => {
	it('offers single countries to points only', () => {
		expect(
			buildAreaItems('country').some((item) => item.group === 'Country'),
		).toBe(false);
		expect(
			buildAreaItems('point').find((item) => item.value === 'country:FR')?.label,
		).toBe('France');
	});

	it('round-trips a country view through its select value', () => {
		const slice = {
			map: { view: 'country', viewCountry: 'FR' },
		} as GeoMapPlacementSlice;
		expect(toAreaValue(slice)).toBe('country:FR');
		expect(fromAreaValue('country:FR')).toStrictEqual({
			view: 'country',
			viewCountry: 'FR',
		});
		expect(fromAreaValue('asia')).toStrictEqual({ view: 'asia' });
	});
});

describe('placement status', () => {
	it('counts placed rows and lists why the rest were left off', () => {
		const data = makeData({
			totalRows: 45,
			regions: Array.from({ length: 41 }, (_, index) => ({
				code: String(index),
				value: 1,
				raw: '',
			})),
			unmapped: [
				{ raw: 'XK1', rows: 1 },
				{ raw: '', rows: 2 },
			],
			duplicateRows: 1,
		});

		expect(describePlacement(data, 'country', undefined)).toStrictEqual({
			tone: 'warn',
			text: '41 of 45 rows placed',
		});
		expect(describeUnplaced(data, 'country', undefined)).toStrictEqual([
			{ value: 'XK1', why: 'Not a country code or name' },
			{ value: '(empty)', why: 'No value · 2 rows' },
			{ value: 'Repeats', why: '1 row repeats a location; the first is shown' },
		]);
	});

	it('asks for a country before placing states', () => {
		expect(
			describePlacement(makeData({ totalRows: 3 }), 'state', ''),
		).toStrictEqual({
			tone: 'error',
			text: '0 of 3 rows placed · pick a country first',
		});
	});
});
