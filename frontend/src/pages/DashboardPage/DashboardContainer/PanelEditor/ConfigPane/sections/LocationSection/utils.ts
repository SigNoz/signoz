import {
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapLocationModeDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SUBDIVISION_COUNTRY_CODES } from 'lib/visualization/charts/GeoMap/geo/subdivisionCountries';
import {
	type GeoMapPanelData,
	LocationKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import type { ConfigSelectItem } from '../../controls/ConfigSelect/ConfigSelect';

export type RowKind = 'country' | 'state' | 'point';

const MODE = DashboardtypesGeoMapLocationModeDTO;
const LAYER = DashboardtypesGeoMapLayerDTO;
const VIEW = DashboardtypesGeoMapViewDTO;

const KIND_OF_LOCATION: Record<LocationKind, RowKind> = {
	[LocationKind.Country]: 'country',
	[LocationKind.Subdivision]: 'state',
	[LocationKind.Coordinates]: 'point',
};

const KIND_OF_MODE: Partial<
	Record<DashboardtypesGeoMapLocationModeDTO, RowKind>
> = {
	[MODE.country]: 'country',
	[MODE.subdivision]: 'state',
	[MODE.coordinates]: 'point',
};

const MODE_OF_KIND: Record<RowKind, DashboardtypesGeoMapLocationModeDTO> = {
	country: MODE.country,
	state: MODE.subdivision,
	point: MODE.coordinates,
};

/** What each row is: the picked mode, else what the preview placed rows as. */
export function resolveRowKind(
	slice: GeoMapPlacementSlice | undefined,
	data: GeoMapPanelData | undefined,
): RowKind | undefined {
	const mode = slice?.location?.mode;
	if (mode && mode !== MODE.auto) {
		return KIND_OF_MODE[mode];
	}
	return data?.location ? KIND_OF_LOCATION[data.location.kind] : undefined;
}

export function isAutoMode(slice: GeoMapPlacementSlice | undefined): boolean {
	return !slice?.location?.mode || slice.location.mode === MODE.auto;
}

/** The layer drawn: points only for point rows, which draw nothing else. */
export function resolveLayer(
	slice: GeoMapPlacementSlice | undefined,
	kind: RowKind | undefined,
): DashboardtypesGeoMapLayerDTO {
	if (kind === 'point') {
		return LAYER.points;
	}
	const layer = slice?.map?.layer ?? LAYER.regions;
	return layer === LAYER.points ? LAYER.regions : layer;
}

interface KindChange {
	next: GeoMapPlacementSlice;
	/** The area to restore when leaving a state view, which takes over the area. */
	previousView?: DashboardtypesGeoMapViewDTO;
}

/**
 * Switches what a row is, keeping the area and layer usable: states take over
 * the area with their country, and points draw only as points.
 */
export function changeRowKind(
	slice: GeoMapPlacementSlice | undefined,
	from: RowKind | undefined,
	to: RowKind | 'auto',
	{
		previousView,
		suggestedCountry,
	}: {
		previousView?: DashboardtypesGeoMapViewDTO;
		suggestedCountry?: string;
	},
): KindChange {
	const location = { ...slice?.location };
	const map = { ...slice?.map };
	if (to === 'auto') {
		location.mode = MODE.auto;
		location.country = '';
		location.region = '';
		location.lat = '';
		location.lon = '';
	} else {
		location.mode = MODE_OF_KIND[to];
	}
	if (to === 'state') {
		const view = map.view ?? VIEW.world;
		map.view = VIEW.country;
		map.viewCountry = map.viewCountry || suggestedCountry || '';
		if (map.layer === LAYER.points) {
			map.layer = LAYER.regions;
		}
		return {
			next: { location, map },
			previousView: view === VIEW.country ? previousView : view,
		};
	}
	if (from === 'state') {
		map.view = previousView ?? VIEW.world;
	}
	if (to === 'point') {
		map.layer = LAYER.points;
	} else if (map.layer === LAYER.points) {
		map.layer = LAYER.regions;
	}
	return { next: { location, map } };
}

const DISPLAY_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryName(code: string): string {
	try {
		return DISPLAY_NAMES.of(code) ?? code;
	} catch {
		return code;
	}
}

export const STATE_COUNTRY_OPTIONS: ConfigSelectItem[] =
	SUBDIVISION_COUNTRY_CODES.map((code) => ({
		value: code as string,
		label: `${countryName(code)} · ${code}`,
	})).sort((a, b) => a.label.localeCompare(b.label));

const CONTINENTS: [DashboardtypesGeoMapViewDTO, string][] = [
	[VIEW.africa, 'Africa'],
	[VIEW.asia, 'Asia'],
	[VIEW.europe, 'Europe'],
	[VIEW.north_america, 'North America'],
	[VIEW.south_america, 'South America'],
	[VIEW.oceania, 'Oceania'],
];

const COUNTRY_VIEW_PREFIX = 'country:';

/** The area select's items; points can also frame one country. */
export function buildAreaItems(kind: RowKind | undefined): ConfigSelectItem[] {
	const items: ConfigSelectItem[] = [
		{ value: VIEW.world, label: 'World', group: 'Area' },
		{ value: VIEW.fit, label: 'Fit to data', group: 'Area' },
		...CONTINENTS.map(([value, label]) => ({ value, label, group: 'Continent' })),
	];
	if (kind === 'point') {
		items.push(
			...STATE_COUNTRY_OPTIONS.map((option) => ({
				value: `${COUNTRY_VIEW_PREFIX}${option.value}`,
				label: countryName(option.value),
				group: 'Country',
			})),
		);
	}
	return items;
}

export function toAreaValue(slice: GeoMapPlacementSlice | undefined): string {
	const view = slice?.map?.view ?? VIEW.world;
	return view === VIEW.country
		? `${COUNTRY_VIEW_PREFIX}${slice?.map?.viewCountry ?? ''}`
		: view;
}

export function fromAreaValue(
	value: string,
): Pick<NonNullable<GeoMapPlacementSlice['map']>, 'view' | 'viewCountry'> {
	return value.startsWith(COUNTRY_VIEW_PREFIX)
		? { view: VIEW.country, viewCountry: value.slice(COUNTRY_VIEW_PREFIX.length) }
		: { view: value as DashboardtypesGeoMapViewDTO };
}

export const SIZE_LABEL: Record<DashboardtypesGeoMapLayerDTO, string> = {
	regions: 'Circle size',
	bubbles: 'Bubble size',
	points: 'Point size',
};

export interface UnplacedRow {
	value: string;
	why: string;
}

/** Most rows "Show which" lists before counting the rest. */
const LISTED_UNPLACED = 20;

function rowsLabel(count: number): string {
	return `${count.toLocaleString('en-US')} ${count === 1 ? 'row' : 'rows'}`;
}

/** Why each unplaced row was left off, most specific first. */
export function describeUnplaced(
	data: GeoMapPanelData,
	kind: RowKind | undefined,
	viewCountry: string | undefined,
): UnplacedRow[] {
	const why =
		kind === 'point'
			? 'Not a usable latitude and longitude'
			: kind === 'state'
				? `Not a state of ${viewCountry ? countryName(viewCountry) : 'the country'}`
				: 'Not a country code or name';
	const rows: UnplacedRow[] = data.unmapped.map(({ raw, rows: count }) => ({
		value: raw || '(empty)',
		why: raw
			? count > 1
				? `${why} · ${rowsLabel(count)}`
				: why
			: `No value · ${rowsLabel(count)}`,
	}));
	if (data.otherCountryRows > 0) {
		rows.push({
			value: 'Other countries',
			why: `${rowsLabel(data.otherCountryRows)} outside this country`,
		});
	}
	if (data.duplicateRows > 0) {
		rows.push({
			value: 'Repeats',
			why: `${rowsLabel(data.duplicateRows)} ${data.duplicateRows === 1 ? 'repeats' : 'repeat'} a location; the first is shown`,
		});
	}
	if (data.missingValueRows > 0) {
		rows.push({
			value: 'No value',
			why: `${rowsLabel(data.missingValueRows)} without a ${data.colorColumn?.name ?? 'color'} value`,
		});
	}
	if (rows.length > LISTED_UNPLACED) {
		const rest = rows.length - LISTED_UNPLACED;
		return [
			...rows.slice(0, LISTED_UNPLACED),
			{ value: `${rest} more`, why: '' },
		];
	}
	return rows;
}

export type PlacementTone = 'ok' | 'warn' | 'error';

export interface PlacementStatus {
	tone: PlacementTone;
	text: string;
}

export function describePlacement(
	data: GeoMapPanelData,
	kind: RowKind | undefined,
	viewCountry: string | undefined,
): PlacementStatus | undefined {
	const total = data.totalRows;
	if (total === 0 || !kind) {
		return undefined;
	}
	if (kind === 'state' && !viewCountry) {
		return {
			tone: 'error',
			text: `0 of ${rowsLabel(total)} placed · pick a country first`,
		};
	}
	const placed = data.regions.length + data.points.length;
	if (placed === total) {
		return { tone: 'ok', text: `All ${rowsLabel(total)} placed` };
	}
	return {
		tone: placed === 0 ? 'error' : 'warn',
		text: `${placed.toLocaleString('en-US')} of ${rowsLabel(total)} placed`,
	};
}

export type LocationField = 'country' | 'region' | 'lat' | 'lon';

/** The column Auto reads for a field: what the preview placed rows by, else a name match. */
export function autoColumnFor(
	field: LocationField,
	resolved: GeoMapPanelData['location'] | undefined,
	detected: Partial<Record<LocationField, string>>,
): string | undefined {
	if (resolved?.kind === LocationKind.Country && field === 'country') {
		return resolved.country.id;
	}
	if (resolved?.kind === LocationKind.Subdivision && field === 'region') {
		return resolved.region.id;
	}
	if (
		resolved?.kind === LocationKind.Coordinates &&
		(field === 'lat' || field === 'lon')
	) {
		return resolved[field].id;
	}
	return detected[field];
}

const KIND_HELP: Record<RowKind, string> = {
	country: 'Each row is shaded on its country.',
	state: 'Each row is one state of the country you pick below.',
	point: 'Each row is drawn at its latitude and longitude.',
};

export function describeKind({
	hasGroupBy,
	kind,
	isAuto,
	autoColumn,
}: {
	hasGroupBy: boolean;
	kind: RowKind | undefined;
	isAuto: boolean;
	autoColumn: (field: LocationField) => string | undefined;
}): string {
	if (!hasGroupBy) {
		return 'Nothing to detect yet.';
	}
	if (!kind) {
		return 'No group-by column looks like a location. Pick a type to choose the column yourself.';
	}
	if (!isAuto) {
		return KIND_HELP[kind];
	}
	const from =
		kind === 'point'
			? `${autoColumn('lat')} and ${autoColumn('lon')}`
			: autoColumn(kind === 'state' ? 'region' : 'country');
	return `Auto-detected from ${from}.`;
}

export function describeLayer(
	kind: RowKind | undefined,
	layer: DashboardtypesGeoMapLayerDTO,
): string {
	if (kind === 'point') {
		return 'Each row is drawn at its latitude and longitude. Shaded areas and Bubbles need country or state rows.';
	}
	const shape = kind === 'state' ? 'state' : 'country';
	return layer === LAYER.regions
		? `Fills each ${shape} with its color.`
		: `Draws a circle at the center of each ${shape}.`;
}

export function describeSize({
	layer,
	sizeBy,
	colorLabel,
	sizeLabel,
}: {
	layer: DashboardtypesGeoMapLayerDTO;
	sizeBy: string | undefined;
	colorLabel: string;
	sizeLabel: string;
}): string {
	if (layer === LAYER.regions) {
		return sizeBy
			? `Adds a circle on each shape. Its area follows ${sizeLabel}.`
			: 'Off. Pick a value to add a circle on each shape.';
	}
	if (sizeBy && sizeLabel !== colorLabel) {
		return `Color shows ${colorLabel}, size shows ${sizeLabel}.`;
	}
	return `Bigger ${layer === LAYER.bubbles ? 'bubbles' : 'points'} mean a higher ${sizeLabel}.`;
}
