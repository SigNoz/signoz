// Natural Earth admin-0 → the countries topology and the lookup tables.
import { geoArea, geoBounds } from 'd3-geo';
import { feature } from 'topojson-client';

import {
	CONTINENT_REGION,
	COUNTRY_ALIASES,
	COUNTRY_MIN_WEIGHT,
	COUNTRY_NAME_ALIASES,
	COUNTRY_QUANTIZATION,
	EXTRA_REGIONS,
	NON_COUNTRY_CODES,
	OPEN_OCEAN_REGION,
} from './config.mjs';
import {
	polygonsOf,
	round,
	roundBounds,
	simplifyAndQuantize,
} from './geometry.mjs';

export const isCountryCode = (value) => /^[A-Z]{2}$/.test(value ?? '');

function regionsOf(props, iso2) {
	const base = props.CONTINENT.startsWith('Seven seas')
		? OPEN_OCEAN_REGION[props.REGION_UN]
		: CONTINENT_REGION[props.CONTINENT];
	return [...new Set([base, ...(EXTRA_REGIONS[iso2] ?? [])].filter(Boolean))];
}

// Group features by code so a country's overseas parts (Australia's Indian
// Ocean territories) become one shape that one data row colours.
function groupByCode(sourceFeatures, report) {
	const groups = new Map();
	for (const f of sourceFeatures) {
		const p = f.properties;
		if (p.CONTINENT === 'Antarctica') {
			report.dropped.push(p.NAME);
			continue;
		}
		const iso2 = isCountryCode(p.ISO_A2_EH) ? p.ISO_A2_EH : null;
		const key = iso2 ?? `uncoded:${p.NAME}`;
		if (!iso2) {
			report.uncoded.push(p.NAME);
		}
		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key).push(f);
	}
	return groups;
}

function toCountryFeature(key, members, report) {
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

	return {
		type: 'Feature',
		id: iso2 ?? p.NAME,
		properties: {
			code: iso2,
			iso3: /^[A-Z]{3}$/.test(p.ISO_A3_EH) ? p.ISO_A3_EH : null,
			name: p.NAME,
			label: [round(p.LABEL_X), round(p.LABEL_Y)],
			mainland: roundBounds(geoBounds(mainland)),
			bounds: roundBounds(geoBounds(geometry)),
			regions: regionsOf(p, iso2 ?? ''),
		},
		geometry,
	};
}

/** Alpha-3 codes and English names → alpha-2, for normalising data. */
function buildLookups(sourceFeatures) {
	const alpha3 = {};
	const names = { ...COUNTRY_NAME_ALIASES };
	for (const { properties: p } of sourceFeatures) {
		if (!isCountryCode(p.ISO_A2_EH) || p.CONTINENT === 'Antarctica') {
			continue;
		}
		if (/^[A-Z]{3}$/.test(p.ISO_A3_EH)) {
			alpha3[p.ISO_A3_EH] = p.ISO_A2_EH;
		}
		for (const name of [
			p.NAME,
			p.NAME_LONG,
			p.ADMIN,
			p.NAME_EN,
			p.BRK_NAME,
			p.NAME_SORT,
			p.NAME_CIAWF,
		]) {
			if (name) {
				names[name.toLowerCase()] ??= p.ISO_A2_EH;
			}
		}
	}
	return { alpha3, names, aliases: COUNTRY_ALIASES };
}

/** ISO alpha-2 codes Intl knows that neither a shape nor an alias covers. */
function findUncoveredCodes(drawn) {
	const display = new Intl.DisplayNames(['en'], {
		type: 'region',
		fallback: 'none',
	});
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const uncovered = [];
	for (const a of letters) {
		for (const b of letters) {
			const code = a + b;
			const name = display.of(code);
			if (
				name &&
				!NON_COUNTRY_CODES.has(code) &&
				!drawn.has(code) &&
				!COUNTRY_ALIASES[code]
			) {
				uncovered.push(`${code} ${name}`);
			}
		}
	}
	return uncovered;
}

/** Natural Earth admin-0 GeoJSON → `{ topology, lookups, report }`. */
export function buildCountries(source) {
	const report = { dropped: [], uncoded: [], merged: [] };
	const features = [...groupByCode(source.features, report)]
		.map(([key, members]) => toCountryFeature(key, members, report))
		.sort((a, b) => String(a.id).localeCompare(String(b.id)));

	const { topo, flipped, collapsed, emptied } = simplifyAndQuantize(
		'countries',
		features,
		COUNTRY_MIN_WEIGHT,
		COUNTRY_QUANTIZATION,
	);
	const drawn = new Set(features.map((f) => f.properties.code).filter(Boolean));
	// Lets data be checked against the drawn codes without decoding the outlines.
	const lookups = { codes: [...drawn].sort(), ...buildLookups(source.features) };

	const regionCounts = {};
	for (const f of features) {
		for (const region of f.properties.regions) {
			regionCounts[region] = (regionCounts[region] ?? 0) + 1;
		}
	}

	return {
		topology: topo,
		lookups,
		report: {
			features: features.length,
			decodedFeatures: feature(topo, topo.objects.countries).features.length,
			droppedFlippedIslands: flipped,
			droppedCollapsedPolygons: collapsed,
			emptied: emptied.join(' '),
			regionCounts,
			...report,
			lookupCounts: {
				alpha3: Object.keys(lookups.alpha3).length,
				names: Object.keys(lookups.names).length,
				aliases: Object.keys(lookups.aliases).length,
			},
			uncoveredIsoCodes: findUncoveredCodes(drawn),
		},
	};
}
