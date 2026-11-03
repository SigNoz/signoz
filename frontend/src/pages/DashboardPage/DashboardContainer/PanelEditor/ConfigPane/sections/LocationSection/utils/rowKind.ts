import {
	DashboardtypesGeoMapCountryFormatDTO,
	DashboardtypesGeoMapLayerDTO,
	type DashboardtypesGeoMapLocationDTO,
	DashboardtypesGeoMapLocationModeDTO,
	DashboardtypesGeoMapProjectionDTO,
	type DashboardtypesGeoMapSettingsDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	type GeoMapPanelData,
	LocationKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';
import type { GeoMapPlacementSlice } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import { type KindChange, type LocationField, RowKind } from '../types';

const MODE = DashboardtypesGeoMapLocationModeDTO;
const LAYER = DashboardtypesGeoMapLayerDTO;
const VIEW = DashboardtypesGeoMapViewDTO;

const KIND_OF_LOCATION: Record<LocationKind, RowKind> = {
	[LocationKind.Country]: RowKind.Country,
	[LocationKind.Subdivision]: RowKind.State,
	[LocationKind.Coordinates]: RowKind.Point,
};

const KIND_OF_MODE: Partial<
	Record<DashboardtypesGeoMapLocationModeDTO, RowKind>
> = {
	[MODE.country]: RowKind.Country,
	[MODE.subdivision]: RowKind.State,
	[MODE.coordinates]: RowKind.Point,
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

/** The map with `patch` applied; a panel without one starts on the API's defaults. */
export function patchMap(
	map: DashboardtypesGeoMapSettingsDTO | undefined,
	patch: Partial<DashboardtypesGeoMapSettingsDTO> = {},
): DashboardtypesGeoMapSettingsDTO {
	return {
		layer: LAYER.regions,
		view: VIEW.world,
		projection: DashboardtypesGeoMapProjectionDTO.mercator,
		...map,
		...patch,
	};
}

/** The location with `patch` applied; a panel without one starts on the API's defaults. */
export function patchLocation(
	location: DashboardtypesGeoMapLocationDTO | undefined,
	patch: Partial<DashboardtypesGeoMapLocationDTO> = {},
): DashboardtypesGeoMapLocationDTO {
	return {
		mode: MODE.auto,
		countryFormat: DashboardtypesGeoMapCountryFormatDTO.auto,
		...location,
		...patch,
	};
}

export function isAutoMode(slice: GeoMapPlacementSlice | undefined): boolean {
	return !slice?.location?.mode || slice.location.mode === MODE.auto;
}

/** The layer drawn: points only for point rows, which draw nothing else. */
export function resolveLayer(
	slice: GeoMapPlacementSlice | undefined,
	kind: RowKind | undefined,
): DashboardtypesGeoMapLayerDTO {
	if (kind === RowKind.Point) {
		return LAYER.points;
	}
	const layer = slice?.map?.layer ?? LAYER.regions;
	return layer === LAYER.points ? LAYER.regions : layer;
}

/** Where a state view opens when the rows suggest no country; the save API needs one. */
const DEFAULT_STATE_COUNTRY = 'US';

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
	const location = patchLocation(slice?.location);
	const map = patchMap(slice?.map);
	if (to === 'auto') {
		location.mode = MODE.auto;
		location.country = '';
		location.region = '';
		location.lat = '';
		location.lon = '';
	} else {
		location.mode = MODE_OF_KIND[to];
	}
	if (to === RowKind.State) {
		const view = map.view ?? VIEW.world;
		map.view = VIEW.country;
		map.viewCountry =
			map.viewCountry || suggestedCountry || DEFAULT_STATE_COUNTRY;
		if (map.layer === LAYER.points) {
			map.layer = LAYER.regions;
		}
		return {
			next: { location, map },
			previousView: view === VIEW.country ? previousView : view,
		};
	}
	if (from === RowKind.State) {
		map.view = previousView ?? VIEW.world;
	}
	// Only state and point rows frame one country.
	if (to !== RowKind.Point) {
		if (map.view === VIEW.country) {
			map.view = VIEW.world;
		}
		delete map.viewCountry;
	}
	if (to === RowKind.Point) {
		map.layer = LAYER.points;
	} else if (map.layer === LAYER.points) {
		map.layer = LAYER.regions;
	}
	return { next: { location, map } };
}

/** The first row kind other than `except` that the group-by columns can draw. */
export function drawableKind(
	detected: Partial<Record<LocationField, string>>,
	except: RowKind,
): RowKind | undefined {
	const drawable: [RowKind, boolean][] = [
		[RowKind.Country, !!detected.country],
		[RowKind.State, !!detected.region],
		[RowKind.Point, !!(detected.lat && detected.lon)],
	];
	return drawable.find(([kind, can]) => can && kind !== except)?.[0];
}
