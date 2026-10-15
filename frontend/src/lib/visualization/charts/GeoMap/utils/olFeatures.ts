import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import MultiPolygon from 'ol/geom/MultiPolygon';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import type { Extent } from 'ol/extent';
import { fromLonLat, transformExtent } from 'ol/proj';

import { GeoMapShapes } from '../geo/shapes';
import { getViewBox } from '../geo/views';
import {
	GeoMapDatum,
	GeoMapPoint,
	GeoMapView,
	SubdivisionCountry,
} from '../types';

const FORMAT = new GeoJSON();

/** Members and context as OpenLayers features, projected to Web Mercator. */
export function toShapeFeatures(shapes: GeoMapShapes): {
	members: Feature[];
	context: Feature[];
} {
	const members = shapes.shapes.filter((shape) => shapes.isMember(shape));
	const context = shapes.shapes.filter((shape) => !shapes.isMember(shape));
	const read = (list: typeof members): Feature[] =>
		FORMAT.readFeatures(
			{ type: 'FeatureCollection', features: list },
			{ featureProjection: 'EPSG:3857' },
		) as Feature[];
	return { members: read(members), context: read(context) };
}

/** One point per value at its shape's label point. */
export function toBubbleFeatures(
	data: GeoMapDatum[],
	shapes: GeoMapShapes,
): Feature[] {
	return data.flatMap((datum) => {
		const shape = shapes.byCode.get(datum.code);
		if (!shape || !shapes.isMember(shape)) {
			return [];
		}
		return [
			new Feature({
				geometry: new Point(fromLonLat(shape.properties.label)),
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
): Feature[] {
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
				geometry: new Point(fromLonLat(shape.properties.label)),
				code,
				name: shapes.nameOf(code),
				box: [maxX - minX, maxY - minY],
				area: largest.getArea(),
			}),
		];
	});
}

/** One feature per point at its lat/lon, keyed by the point's id. */
export function toPointFeatures(points: GeoMapPoint[]): Feature[] {
	return points.map(
		(point) =>
			new Feature({
				geometry: new Point(fromLonLat([point.lon, point.lat])),
				code: point.id,
			}),
	);
}

/** A view's lon/lat box as a Web Mercator extent. */
export function getViewExtent(
	view: GeoMapView,
	data: GeoMapDatum[],
	country: SubdivisionCountry | undefined,
	points?: GeoMapPoint[],
): Extent {
	const [[west, south], [east, north]] = getViewBox(view, data, country, points);
	return transformExtent(
		[west, Math.max(south, -85), east, Math.min(north, 85)],
		'EPSG:4326',
		'EPSG:3857',
	);
}
