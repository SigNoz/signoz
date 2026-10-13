// Builds the Geo Map outlines assets: Natural Earth 50m admin-0 countries, and
// 10m admin-1 states/provinces for the countries that have a country view.
// Run by hand when bumping Natural Earth or editing regions/aliases; the output is committed.
// Usage: pnpm build:geo-outlines
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { geoArea, geoBounds } from 'd3-geo';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { feature, quantize } from 'topojson-client';

const NATURAL_EARTH_URL =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson';
const NATURAL_EARTH_ADMIN1_URL =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson';
const outDir = join(
	dirname(fileURLToPath(import.meta.url)),
	'../src/lib/visualization/charts/GeoMap/assets',
);

const QUANTIZATION = 1e5;
// Share of the smallest-weight points dropped by simplification.
const SIMPLIFY_QUANTILE = 0.05;
// 10m is street-level detail; a country view needs far less.
const SUBDIVISION_QUANTIZATION = 1e4;
const SUBDIVISION_SIMPLIFY_QUANTILE = 0.985;

// Countries with a states/provinces view. Add one only after checking that the
// GeoIP region codes line up with Natural Earth's admin-1 level for it.
const SUBDIVISION_COUNTRIES = ['US', 'IN'];
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

// presimplify stores each point's weight as a third coordinate and simplify
// keeps it, so it is dropped before quantizing (which would carry it through).
// Simplifying can collapse a tiny island until its ring runs the other way; d3
// then reads it as "the whole globe except this island" and floods the map, so
// any polygon larger than a hemisphere is dropped and the topology rebuilt.
function simplifyAndQuantize(objects, dropQuantile, quantization) {
	const [name] = Object.keys(objects);
	let topo = presimplify(topology(objects));
	topo = simplify(topo, quantile(topo, dropQuantile));
	topo = { ...topo, arcs: topo.arcs.map((arc) => arc.map(([x, y]) => [x, y])) };
	topo = quantize(topo, quantization);

	let flipped = 0;
	const features = feature(topo, topo.objects[name]).features.map((f) => {
		const kept = polygonsOf(f.geometry).filter((coordinates) => {
			const inverted = geoArea({ type: 'Polygon', coordinates }) > 2 * Math.PI;
			flipped += inverted ? 1 : 0;
			return !inverted;
		});
		return { ...f, geometry: { type: 'MultiPolygon', coordinates: kept } };
	});
	if (flipped === 0) {
		return { topo, flipped };
	}
	return {
		topo: quantize(
			topology({ [name]: { type: 'FeatureCollection', features } }),
			quantization,
		),
		flipped,
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

const { topo, flipped: countriesFlipped } = simplifyAndQuantize(
	{ countries: { type: 'FeatureCollection', features } },
	SIMPLIFY_QUANTILE,
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
const subdivisionDir = join(outDir, 'subdivisions');
mkdirSync(subdivisionDir, { recursive: true });
const subdivisionReport = {};
for (const country of SUBDIVISION_COUNTRIES) {
	const shapes = admin1.features
		.filter(
			(f) =>
				f.properties.iso_a2 === country &&
				/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(f.properties.iso_3166_2),
		)
		.map((f) => ({
			type: 'Feature',
			id: f.properties.iso_3166_2,
			properties: {
				code: f.properties.iso_3166_2,
				name: f.properties.name,
				label: [round(f.properties.longitude), round(f.properties.latitude)],
			},
			geometry: f.geometry,
		}))
		.sort((a, b) => a.id.localeCompare(b.id));
	const { topo: subdivisionTopo, flipped } = simplifyAndQuantize(
		{ subdivisions: { type: 'FeatureCollection', features: shapes } },
		SUBDIVISION_SIMPLIFY_QUANTILE,
		SUBDIVISION_QUANTIZATION,
	);
	const subdivisionNames = {};
	for (const f of admin1.features.filter(
		(x) => x.properties.iso_a2 === country,
	)) {
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
	subdivisionReport[country] = {
		shapes: shapes.length,
		droppedFlippedIslands: flipped,
		size: `${kb(json)} raw / ${gz(json)} gzip`,
	};
}

console.log(
	JSON.stringify(
		{
			subdivisions: subdivisionReport,
			countriesDroppedFlippedIslands: countriesFlipped,
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
