import {
	type DashboardtypesGeoMapLocationDTO,
	DashboardtypesGeoMapLocationModeDTO,
	type DashboardtypesGeoMapPanelSpecDTO,
	type DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

import { getQueryColumnKeys } from '../../../utils/getQueryColumnKeys';

type LocationKey = 'country' | 'region' | 'lat' | 'lon';

const LOCATION_KEYS: LocationKey[] = ['country', 'region', 'lat', 'lon'];

/** Keys a picked row kind never reads; auto mode may read any. */
const UNUSED_KEYS: Partial<
	Record<DashboardtypesGeoMapLocationModeDTO, LocationKey[]>
> = {
	[DashboardtypesGeoMapLocationModeDTO.country]: ['region', 'lat', 'lon'],
	[DashboardtypesGeoMapLocationModeDTO.subdivision]: ['lat', 'lon'],
	[DashboardtypesGeoMapLocationModeDTO.coordinates]: ['country', 'region'],
};

function pruneLocation(
	location: DashboardtypesGeoMapLocationDTO,
	groupKeys: Set<string> | undefined,
): DashboardtypesGeoMapLocationDTO {
	const unused = new Set(UNUSED_KEYS[location.mode] ?? []);
	const next = { ...location };
	LOCATION_KEYS.forEach((field) => {
		const key = location[field];
		if (key && (unused.has(field) || (groupKeys && !groupKeys.has(key)))) {
			next[field] = '';
		}
	});
	return next;
}

/**
 * Clears location keys the row kind doesn't read or the queries no longer
 * group by, and value columns they no longer produce, so a save matches what
 * the preview drew instead of failing API validation. ClickHouse SQL and
 * PromQL columns are only known at run time, so only unused keys clear there.
 */
export function pruneStaleBindings(
	spec: DashboardtypesPanelSpecDTO,
): DashboardtypesPanelSpecDTO {
	const { plugin, queries } = spec;
	if (plugin.kind !== 'signoz/GeoMapPanel') {
		return spec;
	}
	const pluginSpec = plugin.spec as DashboardtypesGeoMapPanelSpecDTO;
	const { location, map } = pluginSpec;
	const columnKeys = getQueryColumnKeys(queries);
	const keepValue = (key: string | undefined): string | undefined =>
		key && columnKeys && !columnKeys.valueKeys.has(key) ? '' : key;

	const nextLocation =
		location && pruneLocation(location, columnKeys?.groupKeys);
	const nextMap = map && {
		...map,
		colorBy: keepValue(map.colorBy),
		sizeBy: keepValue(map.sizeBy),
	};
	const isUnchanged =
		LOCATION_KEYS.every((field) => nextLocation?.[field] === location?.[field]) &&
		nextMap?.colorBy === map?.colorBy &&
		nextMap?.sizeBy === map?.sizeBy;
	if (isUnchanged) {
		return spec;
	}
	return {
		...spec,
		plugin: {
			...plugin,
			spec: { ...pluginSpec, location: nextLocation, map: nextMap },
		},
	};
}
