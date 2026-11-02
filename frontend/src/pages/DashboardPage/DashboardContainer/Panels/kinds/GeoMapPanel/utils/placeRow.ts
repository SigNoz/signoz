import { DashboardtypesGeoMapCountryFormatDTO } from 'api/generated/services/sigNoz.schemas';
import { normalizeCountry } from 'lib/visualization/charts/GeoMap/geo/normalizeCountry';
import { normalizeSubdivision } from 'lib/visualization/charts/GeoMap/geo/normalizeSubdivision';
import type { SubdivisionSet } from 'lib/visualization/charts/GeoMap/geo/subdivisions';
import type { GeoMapPoint } from 'lib/visualization/charts/GeoMap/types';
import type {
	PanelTableColumn,
	PanelTableRow,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { toFiniteNumber, toText } from './cellValues';
import { LocationKind, type ResolvedLocation } from '../types';

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

/** Empty when both are, so the row reads as having no location. */
function joinCoordinates(lat: string, lon: string): string {
	return lat || lon ? `${lat}, ${lon}` : '';
}

export type Placement =
	| { kind: 'region'; code: string; raw: string }
	| { kind: 'point'; point: Omit<GeoMapPoint, 'id' | 'value' | 'size'> }
	| { kind: 'unmapped'; raw: string }
	| { kind: 'otherCountry' };

export interface PlacementContext {
	countryFormat: DashboardtypesGeoMapCountryFormatDTO | undefined;
	subdivisions: SubdivisionSet | null;
	labelColumns: PanelTableColumn[];
}

export function placeRow(
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
					raw: joinCoordinates(cell(location.lat), cell(location.lon)),
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
