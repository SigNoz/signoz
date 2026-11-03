import {
	DashboardtypesGeoMapCountryFormatDTO,
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapLocationModeDTO,
	DashboardtypesGeoMapProjectionDTO,
	type DashboardtypesGeoMapLocationDTO,
	type DashboardtypesGeoMapSettingsDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { SubdivisionSet } from 'lib/visualization/charts/GeoMap/geo/subdivisions';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';
import type {
	PanelTable,
	PanelTableColumn,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { prepareGeoMapData } from '../prepareData';
import type { PrepareGeoMapDataArgs } from '../../types';

export const group = (id: string): PanelTableColumn => ({
	id,
	name: id,
	queryName: '',
	isValueColumn: false,
});

export const value = (id: string): PanelTableColumn => ({
	id,
	name: id,
	queryName: id.split('.')[0],
	isValueColumn: true,
});

export function makeTable(
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

export const US_STATES: SubdivisionSet = {
	country: 'US',
	shapes: [],
	codes: new Set(['US-CA', 'US-NY']),
	aliases: {},
	names: { california: 'US-CA' },
};

export const mapOf = (
	settings: Partial<DashboardtypesGeoMapSettingsDTO>,
): DashboardtypesGeoMapSettingsDTO => ({
	layer: DashboardtypesGeoMapLayerDTO.regions,
	view: DashboardtypesGeoMapViewDTO.world,
	projection: DashboardtypesGeoMapProjectionDTO.mercator,
	...settings,
});

export const locationOf = (
	location: Partial<DashboardtypesGeoMapLocationDTO>,
): DashboardtypesGeoMapLocationDTO => ({
	mode: DashboardtypesGeoMapLocationModeDTO.auto,
	countryFormat: DashboardtypesGeoMapCountryFormatDTO.auto,
	...location,
});

export function prepare(
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

export const countryTable = makeTable(
	[group('geo.country.iso_code'), value('A'), value('B')],
	[
		{ 'geo.country.iso_code': 'US', A: 120, B: 4 },
		{ 'geo.country.iso_code': 'deu', A: 80, B: 2 },
		{ 'geo.country.iso_code': 'France', A: 40, B: 'n/a' },
	],
);
