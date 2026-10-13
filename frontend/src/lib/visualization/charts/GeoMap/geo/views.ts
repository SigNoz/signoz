import { geoGraticule } from 'd3-geo';
import type { ExtendedFeature } from 'd3-geo';

import {
	CountryFeature,
	GeoMapDatum,
	GeoMapView,
	GeoMapViewPreset,
	LonLatBox,
	SubdivisionCountry,
} from '../types';
import { COUNTRY_BY_ISO2 } from './countries';

// Centred on 10°E so Chukotka stays joined to Russia; the box spans the same
// 360° starting at the seam that rotation creates (170°W), nudged inside it.
// Antarctica isn't drawn, and Mercator stretches toward the poles, so the world
// frame stops at 58°S and 75°N (the Arctic edge is cropped, as on web maps).
const WORLD_ROTATE: [number, number] = [-10, 0];
const WORLD_BOX: LonLatBox = [
	[-169.99, -58],
	[189.99, 75],
];

/**
 * `box` is fitted as a lon/lat rectangle, not the members' geometry: Russia would
 * stretch Europe to the Pacific and overseas territories would drag a frame
 * across oceans. Fit to data and the country view fall back to the world box.
 */
export const VIEW_PRESETS: Record<GeoMapView, GeoMapViewPreset> = {
	world: { label: 'World', rotate: WORLD_ROTATE, box: WORLD_BOX },
	fit: { label: 'Fit to data', rotate: WORLD_ROTATE, box: WORLD_BOX },
	africa: {
		label: 'Africa',
		rotate: [-17, 0],
		box: [
			[-26, -36],
			[60, 38],
		],
	},
	asia: {
		label: 'Asia',
		rotate: [-95, 0],
		box: [
			[25, -12],
			[150, 58],
		],
	},
	europe: {
		label: 'Europe',
		rotate: [-12, 0],
		box: [
			[-25, 34],
			[45, 71],
		],
	},
	north_america: {
		label: 'N. America',
		rotate: [100, 0],
		box: [
			[-170, 7],
			[-52, 74],
		],
	},
	south_america: {
		label: 'S. America',
		rotate: [60, 0],
		box: [
			[-92, -56],
			[-30, 14],
		],
	},
	// Centred east of the antimeridian so Fiji and NZ's islands aren't split.
	oceania: {
		label: 'Oceania',
		rotate: [-150, 0],
		box: [
			[110, -50],
			[190, 2],
		],
	},
	country: { label: 'Country', rotate: WORLD_ROTATE, box: WORLD_BOX },
};

/**
 * Mercator everywhere, except the US country view: Alaska and Hawaii sit so far
 * from the lower 48 that Albers USA, which insets them, is the only frame that
 * shows every state at a readable size.
 */
export type GeoMapProjectionName = 'mercator' | 'albersUsa';

export interface GeoMapFit {
	projection: GeoMapProjectionName;
	rotate: [number, number];
	object: ExtendedFeature;
}

export function isMember(country: CountryFeature, view: GeoMapView): boolean {
	return (
		view === 'world' ||
		view === 'fit' ||
		country.properties.regions.includes(view)
	);
}

/** Densified outline: a lon/lat box is fitted by its edges, not just its corners. */
function boxOutline(box: LonLatBox): ExtendedFeature {
	return {
		type: 'Feature',
		properties: {},
		geometry: geoGraticule().extent(box).outline(),
	};
}

function padBox([[w, s], [e, n]]: LonLatBox, pad: number): LonLatBox {
	return [
		[Math.max(w - pad, -180), Math.max(s - pad, -85)],
		[Math.min(e + pad, 180), Math.min(n + pad, 85)],
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

function getCountryFit(iso2: SubdivisionCountry): GeoMapFit | null {
	const country = COUNTRY_BY_ISO2.get(iso2);
	if (!country) {
		return null;
	}
	if (iso2 === 'US') {
		return { projection: 'albersUsa', rotate: [0, 0], object: country };
	}
	// Whole-country bounds keep island states (Andaman and Nicobar) in frame,
	// unless they wrap the antimeridian, where only the mainland is usable.
	const { bounds, mainland } = country.properties;
	const box = bounds[0][0] > bounds[1][0] ? mainland : bounds;
	const centre = (box[0][0] + box[1][0]) / 2;
	return {
		projection: 'mercator',
		rotate: [-centre, 0],
		object: boxOutline(padBox(box, 1)),
	};
}

export function getGeoMapFit(
	view: GeoMapView,
	data: GeoMapDatum[],
	country?: SubdivisionCountry,
): GeoMapFit {
	if (view === 'country' && country) {
		const fit = getCountryFit(country);
		if (fit) {
			return fit;
		}
	}
	if (view === 'fit') {
		const box = getFitBox(data.map((datum) => datum.code));
		if (box) {
			const centre = (box[0][0] + box[1][0]) / 2;
			return {
				projection: 'mercator',
				rotate: [-centre, 0],
				object: boxOutline(box),
			};
		}
	}
	const preset = VIEW_PRESETS[view];
	return {
		projection: 'mercator',
		rotate: preset.rotate,
		object: boxOutline(preset.box),
	};
}
