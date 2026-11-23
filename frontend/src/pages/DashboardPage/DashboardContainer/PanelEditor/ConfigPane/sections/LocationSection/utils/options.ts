import {
	type DashboardtypesGeoMapLayerDTO,
	type DashboardtypesGeoMapProjectionDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SUBDIVISION_COUNTRY_CODES } from 'lib/visualization/charts/GeoMap/geo/subdivisionCountries';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import type { ConfigSelectItem } from '../../../controls/ConfigSelect/ConfigSelect';
import { RowKind } from '../types';

const VIEW = DashboardtypesGeoMapViewDTO;

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
	if (kind === RowKind.Point) {
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

export const PROJECTION_HELP: Record<
	DashboardtypesGeoMapProjectionDTO,
	string
> = {
	mercator: 'Keeps shapes true, but land grows toward the poles.',
	equal_earth: 'Draws every country at its true size.',
	natural_earth: 'Balances size and shape; neither is exact.',
};

/** Group-by keys GeoIP enrichment usually sets, each with the keys one pick adds. */
export const SUGGESTED_GROUP_BYS: { label: string; keys: string[] }[] = [
	{ label: 'geo.country.iso_code', keys: ['geo.country.iso_code'] },
	{ label: 'geo.region.iso_code', keys: ['geo.region.iso_code'] },
	{
		label: 'geo.location.lat + lon',
		keys: ['geo.location.lat', 'geo.location.lon'],
	},
];

/** An item's label, or the key itself when no item has it. */
export function labelOfItem(items: ConfigSelectItem[], key: string): string {
	return items.find((item) => item.value === key)?.label ?? key;
}
