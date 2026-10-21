declare module 'd3-geo' {
	/** Radians in, north-up coordinates on the unit sphere out. */
	export interface GeoRawProjection {
		(lambda: number, phi: number): [number, number];
		invert(x: number, y: number): [number, number];
	}

	export const geoEqualEarthRaw: GeoRawProjection;
	export const geoNaturalEarth1Raw: GeoRawProjection;
}
