import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type { Extent } from 'ol/extent';
import type VectorSource from 'ol/source/Vector';
import { fromLonLat, transformExtent } from 'ol/proj';

import { GeoMapShapes } from '../geo/shapes';
import { getViewBox } from '../geo/views';
import { BUBBLE_ALPHA, MIN_OUTLINED_POINT_RADIUS, withAlpha } from './olStyles';
import { toOlProjection } from './olProjections';
import {
	GeoMapDatum,
	GeoMapPoint,
	GeoMapProjection,
	GeoMapView,
	SubdivisionCountry,
} from '../types';

const FORMAT = new GeoJSON();

/** Members and context as OpenLayers features in the map's projection. */
export function toShapeFeatures(
	shapes: GeoMapShapes,
	projection: GeoMapProjection,
): {
	members: Feature[];
	context: Feature[];
} {
	const members = shapes.shapes.filter((shape) => shapes.isMember(shape));
	const context = shapes.shapes.filter((shape) => !shapes.isMember(shape));
	const read = (list: typeof members): Feature[] =>
		FORMAT.readFeatures(
			{ type: 'FeatureCollection', features: list },
			{ featureProjection: toOlProjection(projection) },
		) as Feature[];
	return { members: read(members), context: read(context) };
}

/** Code of the first shape under a lon/lat, searching the sources in order. */
export function findShapeAt(
	sources: (VectorSource | null)[],
	[lon, lat]: [number, number],
	projection: GeoMapProjection,
): string | null {
	const coordinate = fromLonLat([lon, lat], toOlProjection(projection));
	for (const source of sources) {
		const code = source?.getFeaturesAtCoordinate(coordinate)[0]?.get('code');
		if (typeof code === 'string' && code) {
			return code;
		}
	}
	return null;
}

/** One point per value at its shape's label point. */
export function toBubbleFeatures(
	data: GeoMapDatum[],
	shapes: GeoMapShapes,
	projection: GeoMapProjection,
): Feature[] {
	const olProjection = toOlProjection(projection);
	return data.flatMap((datum) => {
		const shape = shapes.byCode.get(datum.code);
		if (!shape || !shapes.isMember(shape)) {
			return [];
		}
		return [
			new Feature({
				geometry: new Point(fromLonLat(shape.properties.label, olProjection)),
				code: datum.code,
			}),
		];
	});
}

/**
 * A label per member shape at its label point, carrying the width and height
 * of its largest polygon: the fit check reads that, so Alaska doesn't make the
 * US look roomy.
 */
export function toLabelFeatures(
	shapes: GeoMapShapes,
	members: Feature[],
	projection: GeoMapProjection,
): Feature[] {
	const olProjection = toOlProjection(projection);
	return members.flatMap((member) => {
		const code = member.get('code') as string | null;
		const shape = code ? shapes.byCode.get(code) : undefined;
		const geometry = member.getGeometry();
		let polygons: Polygon[] = [];
		if (geometry instanceof MultiPolygon) {
			polygons = geometry.getPolygons();
		} else if (geometry instanceof Polygon) {
			polygons = [geometry];
		}
		if (!code || !shape || polygons.length === 0) {
			return [];
		}
		const largest = polygons.reduce((a, b) =>
			a.getArea() >= b.getArea() ? a : b,
		);
		const [minX, minY, maxX, maxY] = largest.getExtent();
		return [
			new Feature({
				geometry: new Point(fromLonLat(shape.properties.label, olProjection)),
				code,
				name: shapes.nameOf(code),
				box: [maxX - minX, maxY - minY],
				area: largest.getArea(),
			}),
		];
	});
}

/** One feature per point at its lat/lon, keyed by the point's id. */
export function toPointFeatures(
	points: GeoMapPoint[],
	projection: GeoMapProjection,
): Feature[] {
	const olProjection = toOlProjection(projection);
	return points.map(
		(point) =>
			new Feature({
				geometry: new Point(fromLonLat([point.lon, point.lat], olProjection)),
				code: point.id,
			}),
	);
}

/**
 * Points for the GPU layer, each carrying the colour, radius and outline width
 * its style reads. Largest first: the GPU draws in order, so small points land
 * on top of big ones.
 */
export function toWebGLPointFeatures(
	points: GeoMapPoint[],
	{
		fillFor,
		radiusFor,
		sizeByCode,
		noData,
		projection,
	}: {
		fillFor: (code: string) => string | null;
		radiusFor: (size: number) => number;
		sizeByCode: Map<string, number>;
		noData: string;
		projection: GeoMapProjection;
	},
): Feature[] {
	const olProjection = toOlProjection(projection);
	return points
		.flatMap((point) => {
			const size = sizeByCode.get(point.id);
			if (size === undefined) {
				return [];
			}
			const radius = radiusFor(size);
			const feature = new Feature({
				geometry: new Point(fromLonLat([point.lon, point.lat], olProjection)),
				code: point.id,
				radius,
				color: withAlpha(fillFor(point.id) ?? noData, BUBBLE_ALPHA),
				stroke: radius >= MIN_OUTLINED_POINT_RADIUS ? 1 : 0,
			});
			feature.setId(point.id);
			return [feature];
		})
		.sort((a, b) => (b.get('radius') as number) - (a.get('radius') as number));
}

/** Samples per box edge: off Mercator, meridians curve, so corners alone crop the frame. */
const EXTENT_STOPS = 16;

/** A view's lon/lat box as an extent in the map's projection. */
export function getViewExtent(
	view: GeoMapView,
	projection: GeoMapProjection,
	data: GeoMapDatum[],
	country: SubdivisionCountry | undefined,
	points?: GeoMapPoint[],
): Extent {
	const [[west, south], [east, north]] = getViewBox(
		view,
		projection,
		data,
		country,
		points,
	);
	return transformExtent(
		[west, Math.max(south, -85), east, Math.min(north, 85)],
		'EPSG:4326',
		toOlProjection(projection),
		EXTENT_STOPS,
	);
}
