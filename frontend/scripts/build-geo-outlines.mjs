// Builds the Geo Map outlines assets: Natural Earth 50m admin-0 countries, and
// 10m admin-1 states/provinces for every country with at least two of them.
// Run by hand when bumping Natural Earth or editing regions/aliases; the output is committed.
// Usage: pnpm build:geo-outlines
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { geoArea, geoBounds } from 'd3-geo';
import { topology } from 'topojson-server';
import { presimplify, simplify } from 'topojson-simplify';
import { feature, merge, quantize } from 'topojson-client';

const NATURAL_EARTH_URL =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson';
const NATURAL_EARTH_ADMIN1_URL =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson';
const outDir = join(
	dirname(fileURLToPath(import.meta.url)),
	'../src/lib/visualization/charts/GeoMap/assets',
);

const QUANTIZATION = 1e5;
// Simplification drops every point whose triangle with its neighbours is
// smaller than this, in square degrees. A fixed size, unlike a share of all
// points, still leaves a small island a few points of its own.
const MIN_WEIGHT = 3e-3;
// 10m is street-level detail; a country view needs far less.
const SUBDIVISION_QUANTIZATION = 1e4;
const SUBDIVISION_MIN_WEIGHT = 1e-3;

// A country view needs at least this many coded states to be worth drawing.
const MIN_SUBDIVISIONS = 2;
// ISO 3166-2 codes that changed after Natural Earth v5.1.2, or older spellings
// still in GeoIP data, mapped to the code the shape carries.
const SUBDIVISION_ALIASES = {
	IN: {
		'IN-CG': 'IN-CT',
		'IN-UK': 'IN-UT',
		'IN-TS': 'IN-TG',
		'IN-OD': 'IN-OR',
		'IN-DD': 'IN-DH',
		'IN-DN': 'IN-DH',
	},
};

// Natural Earth puts these islands in "Seven seas (open ocean)".
const OPEN_OCEAN_REGION = {
	Africa: 'africa',
	Asia: 'asia',
	Americas: 'south_america',
};
const CONTINENT_REGION = {
	Africa: 'africa',
	Asia: 'asia',
	Europe: 'europe',
	'North America': 'north_america',
	'South America': 'south_america',
	Oceania: 'oceania',
};
// Transcontinental countries belong to every region they span.
const EXTRA_REGIONS = {
	RU: ['asia'],
	TR: ['europe'],
	KZ: ['europe'],
	GE: ['europe'],
	AM: ['europe'],
	AZ: ['europe'],
	CY: ['europe'],
	EG: ['asia'],
};
// ISO codes GeoIP emits for places Natural Earth draws inside another country.
const ALIASES = {
	GF: 'FR',
	GP: 'FR',
	MQ: 'FR',
	RE: 'FR',
	YT: 'FR',
	BQ: 'NL',
	SJ: 'NO',
	BV: 'NO',
	CX: 'AU',
	CC: 'AU',
	HM: 'AU',
	UM: 'US',
	TK: 'NZ',
	AC: 'SH',
	TA: 'SH',
	DG: 'IO',
	CP: 'FR',
	FX: 'FR',
	EA: 'ES',
	IC: 'ES',
	CQ: 'GB',
	GI: 'GB',
	// Retired or reserved codes still seen in older data.
	UK: 'GB',
	SU: 'RU',
	YU: 'RS',
	CS: 'RS',
	TP: 'TL',
	BU: 'MM',
	ZR: 'CD',
	DD: 'DE',
	VD: 'VN',
	YD: 'YE',
	RH: 'ZW',
	NH: 'VU',
	HV: 'BF',
	DY: 'BJ',
	AN: 'CW',
};
const NAME_ALIASES = {
	usa: 'US',
	'united states of america': 'US',
	america: 'US',
	uk: 'GB',
	'great britain': 'GB',
	britain: 'GB',
	england: 'GB',
	russia: 'RU',
	'south korea': 'KR',
	'north korea': 'KP',
	czechia: 'CZ',
	'czech republic': 'CZ',
	'ivory coast': 'CI',
	turkiye: 'TR',
	türkiye: 'TR',
	burma: 'MM',
	'cape verde': 'CV',
	swaziland: 'SZ',
	macedonia: 'MK',
	'east timor': 'TL',
	vatican: 'VA',
};

const response = await fetch(NATURAL_EARTH_URL);
if (!response.ok) {
	throw new Error(`Natural Earth download failed: ${response.status}`);
}
const source = await response.json();
const report = { dropped: [], uncoded: [], merged: [] };

const isCode = (value) => /^[A-Z]{2}$/.test(value ?? '');

function regionsOf(props, iso2) {
	const base = props.CONTINENT.startsWith('Seven seas')
		? OPEN_OCEAN_REGION[props.REGION_UN]
		: CONTINENT_REGION[props.CONTINENT];
	return [...new Set([base, ...(EXTRA_REGIONS[iso2] ?? [])].filter(Boolean))];
}

function polygonsOf(geometry) {
	if (geometry.type === 'Polygon') return [geometry.coordinates];
	if (geometry.type === 'MultiPolygon') return geometry.coordinates;
	return [];
}

const round = (n) => Math.round(n * 1e3) / 1e3;

// A shape this many times the minimum weight or smaller could lose every polygon.
const PROTECTED_SHAPE_FACTOR = 10;

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
function protectSmallShapes(topo, features, minWeight) {
	topo.objects[Object.keys(topo.objects)[0]].geometries.forEach(
		(geometry, i) => {
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
		},
	);
}

// presimplify stores each point's weight as a third coordinate and simplify
// keeps it, so it is dropped before quantizing (which would carry it through).
// Simplifying can collapse a tiny island until its ring runs the other way; d3
// then reads it as "the whole globe except this island" and floods the map, so
// any polygon larger than a hemisphere is dropped and the topology rebuilt.
// An island smaller than the minimum weight keeps only its arc's endpoints and
// collapses to a sliver with no area; it is dropped the same way.
function simplifyAndQuantize(objects, minWeight, quantization) {
	const [name] = Object.keys(objects);
	let topo = presimplify(topology(objects));
	protectSmallShapes(topo, objects[name].features, minWeight);
	topo = simplify(topo, minWeight);
	topo = { ...topo, arcs: topo.arcs.map((arc) => arc.map(([x, y]) => [x, y])) };
	topo = quantize(topo, quantization);

	let flipped = 0;
	let collapsed = 0;
	const features = feature(topo, topo.objects[name]).features.map((f) => {
		const kept = polygonsOf(f.geometry).filter((coordinates) => {
			if (new Set(coordinates[0].map((point) => point.join())).size < 3) {
				collapsed += 1;
				return false;
			}
			const inverted = geoArea({ type: 'Polygon', coordinates }) > 2 * Math.PI;
			flipped += inverted ? 1 : 0;
			return !inverted;
		});
		return { ...f, geometry: { type: 'MultiPolygon', coordinates: kept } };
	});
	const emptied = features
		.filter((f) => f.geometry.coordinates.length === 0)
		.map((f) => f.properties.code ?? f.properties.name);
	if (flipped === 0 && collapsed === 0) {
		return { topo, flipped, collapsed, emptied };
	}
	return {
		topo: quantize(
			topology({ [name]: { type: 'FeatureCollection', features } }),
			quantization,
		),
		flipped,
		collapsed,
		emptied,
	};
}
const roundBounds = (b) => b.map(([x, y]) => [round(x), round(y)]);

// Group features by code so a country's overseas parts (Australia's Indian
// Ocean territories) become one shape that one data row colours.
const groups = new Map();
for (const f of source.features) {
	const p = f.properties;
	if (p.CONTINENT === 'Antarctica') {
		report.dropped.push(p.NAME);
		continue;
	}
	const iso2 = isCode(p.ISO_A2_EH) ? p.ISO_A2_EH : null;
	const key = iso2 ?? `uncoded:${p.NAME}`;
	if (!iso2) report.uncoded.push(p.NAME);
	if (!groups.has(key)) groups.set(key, []);
	groups.get(key).push(f);
}

const features = [];
for (const [key, members] of groups) {
	// The sovereign part carries the name, label point and region.
	const primary =
		members.find((f) => f.properties.ISO_A2 === f.properties.ISO_A2_EH) ??
		members.reduce((a, b) => (geoArea(a) >= geoArea(b) ? a : b));
	const p = primary.properties;
	const iso2 = key.startsWith('uncoded:') ? null : key;
	if (members.length > 1) {
		report.merged.push(
			`${iso2}: ${members.map((f) => f.properties.NAME).join(' + ')}`,
		);
	}

	const polygons = members.flatMap((f) => polygonsOf(f.geometry));
	const geometry = { type: 'MultiPolygon', coordinates: polygons };
	const mainland = polygons
		.map((coordinates) => ({ type: 'Polygon', coordinates }))
		.reduce((a, b) => (geoArea(a) >= geoArea(b) ? a : b));

	features.push({
		type: 'Feature',
		id: iso2 ?? p.NAME,
		properties: {
			code: iso2,
			iso3: /^[A-Z]{3}$/.test(p.ISO_A3_EH) ? p.ISO_A3_EH : null,
			name: p.NAME,
			label: [round(p.LABEL_X), round(p.LABEL_Y)],
			mainland: roundBounds(geoBounds(mainland)),
			bounds: roundBounds(geoBounds(geometry)),
			regions: iso2 ? regionsOf(p, iso2) : regionsOf(p, ''),
		},
		geometry,
	});
}
features.sort((a, b) => String(a.id).localeCompare(String(b.id)));

const {
	topo,
	flipped: countriesFlipped,
	collapsed: countriesCollapsed,
	emptied: countriesEmptied,
} = simplifyAndQuantize(
	{ countries: { type: 'FeatureCollection', features } },
	MIN_WEIGHT,
	QUANTIZATION,
);

// Lookups for normalising alpha-3 codes and English names to alpha-2.
const alpha3 = {};
const names = { ...NAME_ALIASES };
for (const f of source.features) {
	const p = f.properties;
	if (!isCode(p.ISO_A2_EH) || p.CONTINENT === 'Antarctica') continue;
	if (/^[A-Z]{3}$/.test(p.ISO_A3_EH)) alpha3[p.ISO_A3_EH] = p.ISO_A2_EH;
	for (const n of [
		p.NAME,
		p.NAME_LONG,
		p.ADMIN,
		p.NAME_EN,
		p.BRK_NAME,
		p.NAME_SORT,
		p.NAME_CIAWF,
	]) {
		if (n) names[n.toLowerCase()] ??= p.ISO_A2_EH;
	}
}
const lookups = { alpha3, names, aliases: ALIASES };

// ISO alpha-2 codes Intl knows that neither a shape nor an alias covers.
const display = new Intl.DisplayNames(['en'], {
	type: 'region',
	fallback: 'none',
});
const drawn = new Set(features.map((f) => f.properties.code).filter(Boolean));
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NON_COUNTRIES = new Set(['EU', 'EZ', 'UN', 'ZZ', 'QO', 'XA', 'XB', 'AQ']);
const uncovered = [];
for (const a of letters) {
	for (const b of letters) {
		const code = a + b;
		const name = display.of(code);
		if (name && !NON_COUNTRIES.has(code) && !drawn.has(code) && !ALIASES[code]) {
			uncovered.push(`${code} ${name}`);
		}
	}
}

mkdirSync(outDir, { recursive: true });
const topoJson = JSON.stringify(topo);
const lookupsJson = JSON.stringify(lookups);
writeFileSync(join(outDir, 'countries-50m.json'), topoJson);
writeFileSync(join(outDir, 'lookups.json'), lookupsJson);

const regionCounts = {};
for (const f of features)
	for (const r of f.properties.regions)
		regionCounts[r] = (regionCounts[r] ?? 0) + 1;
const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`;
const gz = (s) => `${(gzipSync(s).length / 1024).toFixed(0)} KB`;
const decoded = feature(topo, topo.objects.countries).features.length;

// States/provinces, one lazily loaded file per country.
const admin1Response = await fetch(NATURAL_EARTH_ADMIN1_URL);
if (!admin1Response.ok) {
	throw new Error(
		`Natural Earth admin-1 download failed: ${admin1Response.status}`,
	);
}
const admin1 = await admin1Response.json();

// Shapes without an ISO 3166-2 code can't be matched to data, and a code under
// another country's prefix (Puerto Rico's `US-PR`) belongs to that country's file.
const admin1ByCountry = new Map();
const subdivisionUncoded = {};
for (const f of admin1.features) {
	const country = f.properties.iso_a2;
	if (!isCode(country)) {
		continue;
	}
	const code = f.properties.iso_3166_2;
	if (
		!/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(code ?? '') ||
		!code.startsWith(`${country}-`)
	) {
		subdivisionUncoded[country] = (subdivisionUncoded[country] ?? 0) + 1;
		continue;
	}
	if (!admin1ByCountry.has(country)) {
		admin1ByCountry.set(country, []);
	}
	admin1ByCountry.get(country).push(f);
}

// Natural Earth splits some codes across shapes (Dublin's four councils are all
// `IE-D`). Merging them through a topology drops the borders between the parts,
// so one code is one shape with one outline.
function mergeByCode(features) {
	const byCode = new Map();
	for (const f of features) {
		const code = f.properties.iso_3166_2;
		if (!byCode.has(code)) {
			byCode.set(code, []);
		}
		byCode.get(code).push(f);
	}
	const topo = topology({
		parts: { type: 'FeatureCollection', features },
	});
	const geometries = topo.objects.parts.geometries;
	let merged = 0;
	const shapes = [...byCode].map(([code, members]) => {
		// The largest part carries the name and label point.
		const primary = members.reduce((a, b) => (geoArea(a) >= geoArea(b) ? a : b));
		let geometry = primary.geometry;
		if (members.length > 1) {
			merged += members.length - 1;
			geometry = merge(
				topo,
				geometries.filter((_, i) => features[i].properties.iso_3166_2 === code),
			);
		}
		return {
			type: 'Feature',
			id: code,
			properties: {
				code,
				name: primary.properties.name,
				label: [
					round(primary.properties.longitude),
					round(primary.properties.latitude),
				],
			},
			geometry,
		};
	});
	return { shapes: shapes.sort((a, b) => a.id.localeCompare(b.id)), merged };
}

const subdivisionDir = join(outDir, 'subdivisions');
rmSync(subdivisionDir, { recursive: true, force: true });
mkdirSync(subdivisionDir, { recursive: true });
const subdivisionCountries = [];
const subdivisionSkipped = [];
const subdivisionSizes = [];
const subdivisionMerged = {};
const subdivisionFlipped = {};
let subdivisionCollapsed = 0;
const subdivisionEmptied = [];
let subdivisionGzipTotal = 0;
for (const country of [...admin1ByCountry.keys()].sort((a, b) =>
	a.localeCompare(b),
)) {
	const members = admin1ByCountry.get(country);
	const { shapes, merged } = mergeByCode(members);
	if (shapes.length < MIN_SUBDIVISIONS) {
		subdivisionSkipped.push(country);
		continue;
	}
	if (merged) {
		subdivisionMerged[country] = merged;
	}
	const {
		topo: subdivisionTopo,
		flipped,
		collapsed,
		emptied,
	} = simplifyAndQuantize(
		{ subdivisions: { type: 'FeatureCollection', features: shapes } },
		SUBDIVISION_MIN_WEIGHT,
		SUBDIVISION_QUANTIZATION,
	);
	if (flipped) {
		subdivisionFlipped[country] = flipped;
	}
	subdivisionCollapsed += collapsed;
	if (emptied.length) {
		subdivisionEmptied.push(...emptied);
	}
	const subdivisionNames = {};
	for (const f of members) {
		for (const n of [
			f.properties.name,
			f.properties.name_en,
			f.properties.gn_name,
			f.properties.woe_name,
		]) {
			if (n) subdivisionNames[n.toLowerCase()] ??= f.properties.iso_3166_2;
		}
	}
	const json = JSON.stringify({
		...subdivisionTopo,
		aliases: SUBDIVISION_ALIASES[country] ?? {},
		names: subdivisionNames,
	});
	writeFileSync(join(subdivisionDir, `${country}.json`), json);
	subdivisionCountries.push(country);
	const gzipped = gzipSync(json).length;
	subdivisionGzipTotal += gzipped;
	subdivisionSizes.push([country, shapes.length, gzipped]);
}

writeFileSync(
	join(outDir, '../geo/subdivisionCountries.ts'),
	`// Generated by scripts/build-geo-outlines.mjs; do not edit.
export const SUBDIVISION_COUNTRY_CODES = [
${subdivisionCountries.map((country) => `\t'${country}',`).join('\n')}
] as const;
`,
);

const subdivisionReport = {
	countries: subdivisionCountries.length,
	totalGzip: `${(subdivisionGzipTotal / 1024).toFixed(0)} KB`,
	largest: subdivisionSizes
		.sort((a, b) => b[2] - a[2])
		.slice(0, 10)
		.map(([c, n, g]) => `${c}: ${n} shapes, ${(g / 1024).toFixed(0)} KB gzip`),
	skippedUnderMinimum: subdivisionSkipped.join(' '),
	mergedParts: subdivisionMerged,
	uncodedShapes: subdivisionUncoded,
	droppedFlippedIslands: subdivisionFlipped,
	droppedCollapsedPolygons: subdivisionCollapsed,
	emptiedShapes: subdivisionEmptied.join(' '),
};

console.log(
	JSON.stringify(
		{
			subdivisions: subdivisionReport,
			countriesDroppedFlippedIslands: countriesFlipped,
			countriesDroppedCollapsedPolygons: countriesCollapsed,
			countriesEmptied: countriesEmptied.join(' '),
			features: features.length,
			decodedFeatures: decoded,
			sizes: {
				'countries-50m.json': `${kb(topoJson)} raw / ${gz(topoJson)} gzip`,
				'lookups.json': `${kb(lookupsJson)} raw / ${gz(lookupsJson)} gzip`,
			},
			regionCounts,
			dropped: report.dropped,
			uncoded: report.uncoded,
			merged: report.merged,
			lookupCounts: {
				alpha3: Object.keys(alpha3).length,
				names: Object.keys(names).length,
				aliases: Object.keys(ALIASES).length,
			},
			uncoveredIsoCodes: uncovered,
		},
		null,
		2,
	),
);
