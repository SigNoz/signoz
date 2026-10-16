import {
	GeoRawProjection,
	geoEqualEarthRaw,
	geoNaturalEarth1Raw,
} from 'd3-geo';
import type { Coordinate } from 'ol/coordinate';
import {
	addCoordinateTransforms,
	addProjection,
	get as getProjection,
	Projection,
} from 'ol/proj';

import { GeoMapProjection } from '../types';

/** Web Mercator's radius, so every projection zooms and sizes labels alike. */
const EARTH_RADIUS = 6378137;
const RADIANS = Math.PI / 180;

const RAW: Record<Exclude<GeoMapProjection, 'mercator'>, GeoRawProjection> = {
	equal_earth: geoEqualEarthRaw,
	natural_earth: geoNaturalEarth1Raw,
};

function register(code: string, raw: GeoRawProjection): void {
	const [east] = raw(Math.PI, 0);
	const [, north] = raw(0, Math.PI / 2);
	addProjection(
		new Projection({
			code,
			units: 'm',
			extent: [-east, -north, east, north].map((edge) => edge * EARTH_RADIUS),
			worldExtent: [-180, -90, 180, 90],
		}),
	);
	addCoordinateTransforms(
		'EPSG:4326',
		code,
		([lon, lat]: Coordinate): Coordinate =>
			raw(lon * RADIANS, lat * RADIANS).map((value) => value * EARTH_RADIUS),
		([x, y]: Coordinate): Coordinate =>
			raw
				.invert(x / EARTH_RADIUS, y / EARTH_RADIUS)
				.map((value) => value / RADIANS),
	);
}

/** The OpenLayers code for a projection, registered on first use. */
export function toOlProjection(projection: GeoMapProjection): string {
	if (projection === 'mercator') {
		return 'EPSG:3857';
	}
	const code = `signoz:${projection}`;
	if (!getProjection(code)) {
		register(code, RAW[projection]);
	}
	return code;
}
