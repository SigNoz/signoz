import type { MultiPolygon, Position } from 'geojson';

import {
	CountryFeature,
	GeoMapDatum,
	GeoMapProjection,
	GeoMapView,
	GeoMapViewPreset,
	LonLatBox,
	SubdivisionCountry,
} from '../types';
import { COUNTRY_BY_ISO2 } from './countries';

// Antarctica isn't drawn, and Mercator stretches toward the poles, so the world
// frame stops at 58°S and 75°N (the Arctic edge is cropped, as on web maps).
const WORLD_BOX: LonLatBox = [
	[-180, -58],
	[180, 75],
];

/** Equal Earth and Natural Earth don't stretch the Arctic, so it shows up to Greenland's tip. */
const UNSTRETCHED_WORLD_BOX: LonLatBox = [
	[-180, -58],
	[180, 84],
];

/**
 * Each view frames a lon/lat box, not its members' geometry: Russia would
 * stretch Europe to the Pacific and overseas territories would drag a frame
 * across oceans. Fit to data and the country view fall back to the world box.
 */
export const VIEW_PRESETS: Record<GeoMapView, GeoMapViewPreset> = {
	world: { label: 'World', box: WORLD_BOX },
	fit: { label: 'Fit to data', box: WORLD_BOX },
	africa: {
		label: 'Africa',
		box: [
			[-26, -36],
			[60, 38],
		],
	},
	asia: {
		label: 'Asia',
		box: [
			[25, -12],
			[150, 58],
		],
	},
	europe: {
		label: 'Europe',
		box: [
			[-25, 34],
			[45, 71],
		],
	},
	north_america: {
		label: 'N. America',
		box: [
			[-170, 7],
			[-52, 74],
		],
	},
	south_america: {
		label: 'S. America',
		box: [
			[-92, -56],
			[-30, 14],
		],
	},
	// Stops at the antimeridian: shapes aren't repeated across world copies, so
	// Fiji's islands east of 180° fall outside the frame.
	oceania: {
		label: 'Oceania',
		box: [
			[110, -50],
			[180, 2],
		],
	},
	country: { label: 'Country', box: WORLD_BOX },
};

export function isMember(country: CountryFeature, view: GeoMapView): boolean {
	return (
		view === 'world' ||
		view === 'fit' ||
		country.properties.regions.includes(view)
	);
}

function padBox([[w, s], [e, n]]: LonLatBox, pad: number): LonLatBox {
	return [
		[Math.max(w - pad, -180), Math.max(s - pad, -85)],
		[e + pad, Math.min(n + pad, 85)],
	];
}

/** Union of the mainland bounds of the given countries, padded; for Fit to data. */
function getFitBox(iso2s: string[]): LonLatBox | null {
	const boxes = iso2s
		.map((iso2) => COUNTRY_BY_ISO2.get(iso2)?.properties.mainland)
		.filter((box): box is LonLatBox => Boolean(box));
	if (boxes.length === 0) {
		return null;
	}
	let [[west, south], [east, north]] = boxes[0];
	boxes.forEach(([[w, s], [e, n]]) => {
		// A mainland crossing the antimeridian reports west > east; keep its west part.
		const eastEdge = w > e ? 180 : e;
		west = Math.min(west, w);
		south = Math.min(south, s);
		east = Math.max(east, eastEdge);
		north = Math.max(north, n);
	});
	return padBox(
		[
			[west, south],
			[east, north],
		],
		3,
	);
}

// Alaska is near enough and big enough to join the frame, which would shrink
// every other state, so the US view is the lower 48.
const MAINLAND_ONLY = new Set<string>(['US']);

/** Smallest polygon, as a share of the largest, that can widen a country's frame. */
const MIN_FRAME_SHARE = 0.0025;
/** Widest gap, in degrees, between the frame and a polygon that joins it. */
const MAX_FRAME_GAP = 10;

interface PolygonExtent {
	box: LonLatBox;
	area: number;
}

/** Outer-ring box and area, in degrees with longitude scaled by latitude. */
function extentOf([ring]: Position[][]): PolygonExtent {
	let [west, south, east, north] = [180, 90, -180, -90];
	ring.forEach(([lon, lat]) => {
		west = Math.min(west, lon);
		south = Math.min(south, lat);
		east = Math.max(east, lon);
		north = Math.max(north, lat);
	});
	const scale = Math.cos((((south + north) / 2) * Math.PI) / 180);
	let twiceArea = 0;
	ring.forEach(([lon, lat], index) => {
		const [nextLon, nextLat] = ring[(index + 1) % ring.length];
		twiceArea += lon * scale * nextLat - nextLon * scale * lat;
	});
	return {
		box: [
			[west, south],
			[east, north],
		],
		area: Math.abs(twiceArea) / 2,
	};
}

function gapBetween(
	[[aW, aS], [aE, aN]]: LonLatBox,
	[[bW, bS], [bE, bN]]: LonLatBox,
): number {
	return Math.max(0, bW - aE, aW - bE, bS - aN, aS - bN);
}

function union(
	[[aW, aS], [aE, aN]]: LonLatBox,
	[[bW, bS], [bE, bN]]: LonLatBox,
): LonLatBox {
	return [
		[Math.min(aW, bW), Math.min(aS, bS)],
		[Math.max(aE, bE), Math.max(aN, bN)],
	];
}

/**
 * Grows the largest polygon's box by every sizeable polygon near it, so island
 * chains (Indonesia, Japan, the Canaries) stay in frame while far territories
 * (French Guiana, Réunion, Easter Island) don't drag it across an ocean. Natural
 * Earth splits polygons at the antimeridian, so a far side never counts as near.
 */
function getFrame(geometry: MultiPolygon): LonLatBox {
	const [largest, ...rest] = geometry.coordinates
		.map(extentOf)
		.sort((a, b) => b.area - a.area);
	let frame = largest.box;
	let pending = rest.filter(
		(part) => part.area >= largest.area * MIN_FRAME_SHARE,
	);
	let grew = true;
	while (grew) {
		grew = false;
		pending = pending.filter((part) => {
			if (gapBetween(frame, part.box) > MAX_FRAME_GAP) {
				return true;
			}
			frame = union(frame, part.box);
			grew = true;
			return false;
		});
	}
	return frame;
}

function getCountryBox(iso2: SubdivisionCountry): LonLatBox | null {
	const country = COUNTRY_BY_ISO2.get(iso2);
	if (!country) {
		return null;
	}
	return padBox(
		MAINLAND_ONLY.has(iso2)
			? country.properties.mainland
			: getFrame(country.geometry),
		1,
	);
}

// Points are circles with an on-screen radius, so the margin grows with the
// spread of the points: a fixed few degrees cuts the edge circles in half.
const POINTS_PAD_SHARE = 0.08;

/** The box around lat/lon points, padded; for Fit to data on the points layer. */
function getPointsBox(
	points: { lat: number; lon: number }[],
): LonLatBox | null {
	if (points.length === 0) {
		return null;
	}
	// A loop, not Math.min(...): spreading 100k arguments overflows the stack.
	let [west, south, east, north] = [180, 90, -180, -90];
	points.forEach(({ lat, lon }) => {
		west = Math.min(west, lon);
		east = Math.max(east, lon);
		south = Math.min(south, lat);
		north = Math.max(north, lat);
	});
	const pad = Math.max(
		3,
		Math.max(east - west, north - south) * POINTS_PAD_SHARE,
	);
	return padBox(
		[
			[west, south],
			[east, north],
		],
		pad,
	);
}

/** The lon/lat box a view frames. */
export function getViewBox(
	view: GeoMapView,
	projection: GeoMapProjection,
	data: GeoMapDatum[],
	country?: SubdivisionCountry,
	points?: { lat: number; lon: number }[],
): LonLatBox {
	if (view === 'country' && country) {
		const box = getCountryBox(country);
		if (box) {
			return box;
		}
	}
	if (view === 'fit') {
		const box = points
			? getPointsBox(points)
			: getFitBox(data.map((datum) => datum.code));
		if (box) {
			return box;
		}
	}
	const { box } = VIEW_PRESETS[view];
	return box === WORLD_BOX && projection !== 'mercator'
		? UNSTRETCHED_WORLD_BOX
		: box;
}
