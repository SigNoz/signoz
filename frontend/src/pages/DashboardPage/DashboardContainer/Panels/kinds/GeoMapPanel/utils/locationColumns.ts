import {
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapLocationModeDTO,
	DashboardtypesGeoMapViewDTO,
	type DashboardtypesGeoMapLocationDTO,
	type DashboardtypesGeoMapSettingsDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { PanelTableColumn } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import {
	LocationKind,
	type ResolvedLocation,
	type StaleBinding,
} from '../types';

// Group-by keys auto mode recognises, most specific first. OTel semantic
// conventions lead; the rest are common GeoIP and CDN spellings.
const COUNTRY_KEYS = [
	'geo.country.iso_code',
	'client.geo.country.iso_code',
	'network.client.geoip.country.iso_code',
	'geo.country_iso_code',
	'geoip.country_code',
	'country.iso_code',
	'country_code',
	'cf-ipcountry',
	'country',
	'geo.country.name',
	'country_name',
];
const REGION_KEYS = [
	'geo.region.iso_code',
	'client.geo.region.iso_code',
	'geo.subdivision.iso_code',
	'region_code',
	'region',
	'subdivision',
	'state',
];
const LAT_KEYS = [
	'geo.location.lat',
	'client.geo.location.lat',
	'geo.lat',
	'location.lat',
	'latitude',
	'lat',
];
const LON_KEYS = [
	'geo.location.lon',
	'client.geo.location.lon',
	'geo.lon',
	'location.lon',
	'longitude',
	'long',
	'lon',
	'lng',
];

export function findById(
	columns: PanelTableColumn[],
	key: string | undefined,
): PanelTableColumn | undefined {
	return key ? columns.find((column) => column.id === key) : undefined;
}

function detect(
	columns: PanelTableColumn[],
	keys: string[],
): PanelTableColumn | undefined {
	const byId = new Map(
		columns.map((column) => [column.id.toLowerCase(), column]),
	);
	return keys.map((key) => byId.get(key)).find(Boolean);
}

/**
 * Raw SQL marks every numeric column as a value, coordinates included. A column
 * bound as lat/lon, or named like one when unbound, is a location instead, but
 * only while it can place points: never in country or state mode, and in auto
 * mode only when both a latitude and a longitude are present.
 */
export function findCoordinateColumns(
	ids: string[],
	location: DashboardtypesGeoMapLocationDTO | undefined,
): Set<string> {
	const mode = location?.mode ?? DashboardtypesGeoMapLocationModeDTO.auto;
	if (
		mode === DashboardtypesGeoMapLocationModeDTO.country ||
		mode === DashboardtypesGeoMapLocationModeDTO.subdivision
	) {
		return new Set();
	}
	const matching = (bound: string | undefined, keys: string[]): string[] =>
		ids.filter((id) => (bound ? id === bound : keys.includes(id.toLowerCase())));
	const lat = matching(location?.lat, LAT_KEYS);
	const lon = matching(location?.lon, LON_KEYS);
	if (
		mode === DashboardtypesGeoMapLocationModeDTO.auto &&
		(lat.length === 0 || lon.length === 0)
	) {
		return new Set();
	}
	return new Set([...lat, ...lon]);
}

export interface DetectedLocationColumns {
	country?: string;
	region?: string;
	lat?: string;
	lon?: string;
}

/** The group-by columns auto mode would read, by name. */
export function detectLocationColumns(
	groupColumns: string[],
): DetectedLocationColumns {
	const columns = groupColumns.map((id) => ({
		id,
		name: id,
		queryName: '',
		isValueColumn: false,
	}));
	return {
		country: detect(columns, COUNTRY_KEYS)?.id,
		region: detect(columns, REGION_KEYS)?.id,
		lat: detect(columns, LAT_KEYS)?.id,
		lon: detect(columns, LON_KEYS)?.id,
	};
}

export function resolveLocation(
	groupColumns: PanelTableColumn[],
	location: DashboardtypesGeoMapLocationDTO | undefined,
	map: DashboardtypesGeoMapSettingsDTO | undefined,
): ResolvedLocation | null {
	const pick = (
		key: string | undefined,
		keys: string[],
	): PanelTableColumn | undefined =>
		findById(groupColumns, key) ?? detect(groupColumns, keys);
	const country = pick(location?.country, COUNTRY_KEYS);
	const region = pick(location?.region, REGION_KEYS);
	const lat = pick(location?.lat, LAT_KEYS);
	const lon = pick(location?.lon, LON_KEYS);
	const coordinates =
		lat && lon ? { kind: LocationKind.Coordinates as const, lat, lon } : null;
	const subdivision = region
		? { kind: LocationKind.Subdivision as const, region, country }
		: null;
	const byCountry = (
		column: PanelTableColumn | undefined,
	): ResolvedLocation | null =>
		column ? { kind: LocationKind.Country, country: column } : null;

	switch (location?.mode) {
		case DashboardtypesGeoMapLocationModeDTO.country:
			return byCountry(country ?? groupColumns[0]);
		case DashboardtypesGeoMapLocationModeDTO.subdivision:
			return subdivision;
		case DashboardtypesGeoMapLocationModeDTO.coordinates:
			return coordinates;
		default:
			if (map?.layer === DashboardtypesGeoMapLayerDTO.points && coordinates) {
				return coordinates;
			}
			if (map?.view === DashboardtypesGeoMapViewDTO.country && subdivision) {
				return subdivision;
			}
			return byCountry(country) ?? coordinates ?? byCountry(groupColumns[0]);
	}
}

export function findStaleBindings(
	columns: PanelTableColumn[],
	location: DashboardtypesGeoMapLocationDTO | undefined,
	map: DashboardtypesGeoMapSettingsDTO | undefined,
): StaleBinding[] {
	const bindings: StaleBinding[] = [
		{ field: 'country', key: location?.country ?? '' },
		{ field: 'region', key: location?.region ?? '' },
		{ field: 'lat', key: location?.lat ?? '' },
		{ field: 'lon', key: location?.lon ?? '' },
		{ field: 'colorBy', key: map?.colorBy ?? '' },
		{ field: 'sizeBy', key: map?.sizeBy ?? '' },
	];
	return bindings.filter(({ key }) => key && !findById(columns, key));
}
