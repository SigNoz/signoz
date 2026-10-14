import {
	CountryFeature,
	GeoMapDatum,
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

/**
 * Whole-country bounds keep island states (Andaman and Nicobar) in frame,
 * unless they wrap the antimeridian (the US's Aleutians, Russia), where only
 * the mainland is usable: for the US that is the lower 48.
 */
function getCountryBox(iso2: SubdivisionCountry): LonLatBox | null {
	const country = COUNTRY_BY_ISO2.get(iso2);
	if (!country) {
		return null;
	}
	const { bounds, mainland } = country.properties;
	return padBox(bounds[0][0] > bounds[1][0] ? mainland : bounds, 1);
}

/** The lon/lat box a view frames. */
export function getViewBox(
	view: GeoMapView,
	data: GeoMapDatum[],
	country?: SubdivisionCountry,
): LonLatBox {
	if (view === 'country' && country) {
		const box = getCountryBox(country);
		if (box) {
			return box;
		}
	}
	if (view === 'fit') {
		const box = getFitBox(data.map((datum) => datum.code));
		if (box) {
			return box;
		}
	}
	return VIEW_PRESETS[view].box;
}
