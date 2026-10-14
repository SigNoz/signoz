// Geometry helpers and the simplification shared by countries and states.
import { geoArea } from 'd3-geo';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature, quantize } from 'topojson-client';

import { PROTECTED_SHAPE_FACTOR } from './config.mjs';

export const round = (n) => Math.round(n * 1e3) / 1e3;
export const roundBounds = (bounds) =>
	bounds.map(([x, y]) => [round(x), round(y)]);

export function polygonsOf(geometry) {
	if (geometry.type === 'Polygon') {
		return [geometry.coordinates];
	}
	if (geometry.type === 'MultiPolygon') {
		return geometry.coordinates;
	}
	return [];
}

/** Area of a lon/lat ring in square degrees, the unit of the simplify weights. */
function planarRingArea(ring) {
	let twice = 0;
	ring.forEach(([x, y], i) => {
		const [nx, ny] = ring[(i + 1) % ring.length];
		twice += x * ny - nx * y;
	});
	return Math.abs(twice) / 2;
}

// Weights every point of a small shape's largest outline as Infinity, which
// simplify never removes, so a city-state or city-sized province (Monaco, a
// London borough) still has an outline to colour. Neighbours share those arcs,
// so their common border stays in step.
function protectSmallShapes(topo, objectName, features, minWeight) {
	topo.objects[objectName].geometries.forEach((geometry, i) => {
		const polygons = polygonsOf(features[i].geometry);
		const areas = polygons.map(([outer]) => planarRingArea(outer));
		const total = areas.reduce((sum, area) => sum + area, 0);
		if (polygons.length === 0 || total > minWeight * PROTECTED_SHAPE_FACTOR) {
			return;
		}
		const largest = areas.indexOf(Math.max(...areas));
		const rings =
			geometry.type === 'Polygon' ? geometry.arcs : geometry.arcs[largest];
		rings[0].forEach((index) => {
			topo.arcs[index < 0 ? ~index : index].forEach((point) => {
				point[2] = Infinity;
			});
		});
	});
}

const isCollapsed = ([outer]) =>
	new Set(outer.map((point) => point.join())).size < 3;

// Simplifying can collapse a tiny island until its ring runs the other way; d3
// then reads it as "the whole globe except this island" and floods the map.
const isInverted = (coordinates) =>
	geoArea({ type: 'Polygon', coordinates }) > 2 * Math.PI;

/**
 * One feature collection to a simplified, quantized topology under
 * `objectName`. Polygons that collapse to a sliver or flip inside out are
 * dropped and the topology rebuilt without them.
 */
export function simplifyAndQuantize(
	objectName,
	features,
	minWeight,
	quantization,
) {
	let topo = presimplify(
		topology({ [objectName]: { type: 'FeatureCollection', features } }),
	);
	protectSmallShapes(topo, objectName, features, minWeight);
	topo = simplify(topo, minWeight);
	// presimplify stores each point's weight as a third coordinate and simplify
	// keeps it, so it is dropped before quantizing (which would carry it through).
	topo = { ...topo, arcs: topo.arcs.map((arc) => arc.map(([x, y]) => [x, y])) };
	topo = quantize(topo, quantization);

	let flipped = 0;
	let collapsed = 0;
	const cleaned = feature(topo, topo.objects[objectName]).features.map((f) => {
		const kept = polygonsOf(f.geometry).filter((coordinates) => {
			if (isCollapsed(coordinates)) {
				collapsed += 1;
				return false;
			}
			if (isInverted(coordinates)) {
				flipped += 1;
				return false;
			}
			return true;
		});
		return { ...f, geometry: { type: 'MultiPolygon', coordinates: kept } };
	});
	const emptied = cleaned
		.filter((f) => f.geometry.coordinates.length === 0)
		.map((f) => f.properties.code ?? f.properties.name);

	if (flipped > 0 || collapsed > 0) {
		topo = quantize(
			topology({
				[objectName]: { type: 'FeatureCollection', features: cleaned },
			}),
			quantization,
		);
	}
	return { topo, flipped, collapsed, emptied };
}
