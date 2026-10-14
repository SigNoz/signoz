import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import Point from 'ol/geom/Point';
import type { Extent } from 'ol/extent';
import { fromLonLat, transformExtent } from 'ol/proj';

import { GeoMapShapes } from '../geo/shapes';
import { getViewBox } from '../geo/views';
import { GeoMapDatum, GeoMapView, SubdivisionCountry } from '../types';

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

/** A view's lon/lat box as a Web Mercator extent. */
export function getViewExtent(
	view: GeoMapView,
	data: GeoMapDatum[],
	country: SubdivisionCountry | undefined,
): Extent {
	const [[west, south], [east, north]] = getViewBox(view, data, country);
	return transformExtent(
		[west, Math.max(south, -85), east, Math.min(north, 85)],
		'EPSG:4326',
		'EPSG:3857',
	);
}
