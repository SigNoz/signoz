import {
	DashboardtypesGeoMapCountryFormatDTO,
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapLocationModeDTO,
	DashboardtypesGeoMapViewDTO,
	type DashboardtypesGeoMapLocationDTO,
	type DashboardtypesGeoMapSettingsDTO,
} from 'api/generated/services/sigNoz.schemas';
import { normalizeCountry } from 'lib/visualization/charts/GeoMap/geo/normalizeCountry';
import { normalizeSubdivision } from 'lib/visualization/charts/GeoMap/geo/normalizeSubdivision';
import type { SubdivisionSet } from 'lib/visualization/charts/GeoMap/geo/subdivisions';
import type { GeoMapPoint } from 'lib/visualization/charts/GeoMap/types';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';
import type {
	PanelTableColumn,
	PanelTableRow,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { getColumnUnit } from '../../utils/getColumnUnit';
import { resolveActiveThreshold } from '../../utils/evaluateThresholds';
import { MAX_ROWS } from './constants';
import {
	type GeoMapPanelData,
	LocationKind,
	type PrepareGeoMapDataArgs,
	type ResolvedLocation,
	type StaleBinding,
} from './types';

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
	'lon',
	'lng',
];

/**
 * A finite number, or null. The backend sends NaN/±Inf as strings and fills
 * join misses with `"n/a"`; none of those may draw, least of all as 0.
 */
export function toFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

/** A group value as text; anything but a string or number is empty. */
export function toText(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number'
		? String(value).trim()
		: '';
}

function findById(
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

function resolveLocation(
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

const CODE_PATTERN: Partial<
	Record<DashboardtypesGeoMapCountryFormatDTO, RegExp>
> = {
	[DashboardtypesGeoMapCountryFormatDTO.alpha2]: /^[a-z]{2}$/i,
	[DashboardtypesGeoMapCountryFormatDTO.alpha3]: /^[a-z]{3}$/i,
};

/** Alpha-2 for a country value, read only in the declared format. */
function toCountryCode(
	value: string,
	format: DashboardtypesGeoMapCountryFormatDTO | undefined,
): string | null {
	const pattern = format && CODE_PATTERN[format];
	if (pattern && !pattern.test(value)) {
		return null;
	}
	if (
		format === DashboardtypesGeoMapCountryFormatDTO.name &&
		/^[a-z]{2,3}$/i.test(value)
	) {
		return null;
	}
	return normalizeCountry(value);
}

function findStaleBindings(
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

function inRange(lat: number, lon: number): boolean {
	return Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** The point's other group values; empty lets the map name it by where it falls. */
function pointLabel(
	row: PanelTableRow,
	labelColumns: PanelTableColumn[],
): string {
	return labelColumns
		.map((column) => toText(row.data[column.id]))
		.filter(Boolean)
		.join(', ');
}

type Placement =
	| { kind: 'region'; code: string; raw: string }
	| { kind: 'point'; point: Omit<GeoMapPoint, 'id' | 'value' | 'size'> }
	| { kind: 'unmapped'; raw: string }
	| { kind: 'otherCountry' };

interface PlacementContext {
	countryFormat: DashboardtypesGeoMapCountryFormatDTO | undefined;
	subdivisions: SubdivisionSet | null;
	labelColumns: PanelTableColumn[];
}

function placeRow(
	row: PanelTableRow,
	location: ResolvedLocation,
	{ countryFormat, subdivisions, labelColumns }: PlacementContext,
): Placement {
	const cell = (column: PanelTableColumn): string => toText(row.data[column.id]);
	switch (location.kind) {
		case LocationKind.Coordinates: {
			const lat = toFiniteNumber(row.data[location.lat.id]);
			const lon = toFiniteNumber(row.data[location.lon.id]);
			if (lat === null || lon === null || !inRange(lat, lon)) {
				return {
					kind: 'unmapped',
					raw: [cell(location.lat), cell(location.lon)].join(', '),
				};
			}
			return {
				kind: 'point',
				point: { lat, lon, label: pointLabel(row, labelColumns) },
			};
		}
		case LocationKind.Subdivision: {
			const raw = cell(location.region);
			const country = location.country ? cell(location.country) : undefined;
			const code =
				subdivisions && normalizeSubdivision(subdivisions, country, raw);
			if (code) {
				return { kind: 'region', code, raw };
			}
			return country && normalizeCountry(country) !== subdivisions?.country
				? { kind: 'otherCountry' }
				: { kind: 'unmapped', raw };
		}
		default: {
			const raw = cell(location.country);
			const code = toCountryCode(raw, countryFormat);
			return code ? { kind: 'region', code, raw } : { kind: 'unmapped', raw };
		}
	}
}

/**
 * One location per row of the joined scalar table. A location seen twice keeps
 * its first row: averages and rates can't be summed.
 */
export function prepareGeoMapData({
	table,
	location,
	map,
	scale,
	subdivisions,
	thresholds = [],
	columnUnits = {},
}: PrepareGeoMapDataArgs): GeoMapPanelData {
	const columns = table?.columns ?? [];
	const rows = table?.rows ?? [];
	const valueColumns = columns.filter((column) => column.isValueColumn);
	const groupColumns = columns.filter((column) => !column.isValueColumn);

	const resolved = resolveLocation(groupColumns, location, map);
	const colorColumn = findById(valueColumns, map?.colorBy) ?? valueColumns[0];
	const sizeColumn = findById(valueColumns, map?.sizeBy);
	const isCoordinates = resolved?.kind === LocationKind.Coordinates;
	const wantsPoints = map?.layer === DashboardtypesGeoMapLayerDTO.points;
	const needsCountryView =
		resolved?.kind === LocationKind.Subdivision && !subdivisions;

	const result: GeoMapPanelData = {
		location: resolved,
		layer: isCoordinates
			? 'points'
			: wantsPoints
				? 'bubbles'
				: (map?.layer ?? 'regions'),
		colorColumn,
		sizeColumn,
		regions: [],
		points: [],
		rowIndexById: new Map(),
		totalRows: rows.length,
		unmapped: [],
		unmappedRows: 0,
		otherCountryRows: 0,
		duplicateRows: 0,
		missingValueRows: 0,
		thresholdConflictRows: 0,
		nonPositiveOnLogRows: 0,
		atRowLimit: rows.length >= MAX_ROWS,
		staleBindings: findStaleBindings(columns, location, map),
		needsCountryView:
			needsCountryView && map?.view !== DashboardtypesGeoMapViewDTO.country,
		pointsWithoutCoordinates: wantsPoints && !!resolved && !isCoordinates,
	};
	if (!resolved || !colorColumn || needsCountryView) {
		return result;
	}

	const unmapped = new Map<string, number>();
	const colorUnit = getColumnUnit(colorColumn.id, columnUnits);
	const paint = (value: number): { color?: string } => {
		if (thresholds.length === 0) {
			return {};
		}
		const { threshold, isConflicting } = resolveActiveThreshold(
			thresholds,
			value,
			colorUnit,
		);
		if (isConflicting) {
			result.thresholdConflictRows += 1;
		}
		return threshold ? { color: threshold.color } : {};
	};
	const labelColumns = isCoordinates
		? groupColumns.filter(
				(column) => column !== resolved.lat && column !== resolved.lon,
			)
		: [];

	rows.forEach((row, index) => {
		const value = toFiniteNumber(row.data[colorColumn.id]);
		if (value === null) {
			result.missingValueRows += 1;
			return;
		}
		const placement = placeRow(row, resolved, {
			countryFormat: location?.countryFormat,
			subdivisions,
			labelColumns,
		});
		const size = sizeColumn ? toFiniteNumber(row.data[sizeColumn.id]) : undefined;
		const sized = sizeColumn ? { size } : {};

		if (placement.kind === 'unmapped') {
			result.unmappedRows += 1;
			unmapped.set(placement.raw, (unmapped.get(placement.raw) ?? 0) + 1);
			return;
		}
		if (placement.kind === 'otherCountry') {
			result.otherCountryRows += 1;
			return;
		}
		if (placement.kind === 'point') {
			const id = String(index);
			result.points.push({
				id,
				value,
				...placement.point,
				...sized,
				...paint(value),
			});
			result.rowIndexById.set(id, index);
		} else if (result.rowIndexById.has(placement.code)) {
			result.duplicateRows += 1;
			return;
		} else {
			result.regions.push({
				code: placement.code,
				value,
				raw: placement.raw,
				...sized,
				...paint(value),
			});
			result.rowIndexById.set(placement.code, index);
		}
		if (scale === ColorRampScale.Log && value <= 0) {
			result.nonPositiveOnLogRows += 1;
		}
	});

	result.unmapped = [...unmapped].map(([raw, rows]) => ({ raw, rows }));
	return result;
}
