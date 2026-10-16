// Natural Earth admin-1 → one states/provinces topology per country.
import { geoArea } from 'd3-geo';
import { topology } from 'topojson-server';
import { merge } from 'topojson-client';

import {
	MIN_SUBDIVISIONS,
	SUBDIVISION_ALIASES,
	SUBDIVISION_MERGES,
	SUBDIVISION_MIN_WEIGHT,
	SUBDIVISION_QUANTIZATION,
} from './config.mjs';
import { isCountryCode } from './countries.mjs';
import { round, simplifyAndQuantize } from './geometry.mjs';

const SUBDIVISION_CODE = /^[A-Z]{2}-[A-Z0-9]{1,3}$/;

/** Retired code → `[current code, current name]`, from `SUBDIVISION_MERGES`. */
const RECODES = new Map(
	Object.values(SUBDIVISION_MERGES).flatMap((merges) =>
		Object.entries(merges).flatMap(([code, [name, retired]]) =>
			retired.map((old) => [old, [code, name]]),
		),
	),
);

/** A country's aliases: the hand-written ones, then each merge's retired codes. */
function aliasesOf(country) {
	const aliases = { ...SUBDIVISION_ALIASES[country] };
	for (const [code, [, retired]] of Object.entries(
		SUBDIVISION_MERGES[country] ?? {},
	)) {
		for (const old of retired) {
			if (old !== code) {
				aliases[old] = code;
			}
		}
	}
	return aliases;
}

// Shapes without an ISO 3166-2 code can't be matched to data, and a code under
// another country's prefix (Puerto Rico's `US-PR`) belongs to that country's
// file. Retired codes are rewritten to the current ones here, so the merge
// below dissolves them.
function groupByCountry(sourceFeatures) {
	const byCountry = new Map();
	const uncoded = {};
	const recoded = new Set();
	for (const f of sourceFeatures) {
		const country = f.properties.iso_a2;
		if (!isCountryCode(country)) {
			continue;
		}
		const code = f.properties.iso_3166_2;
		if (!SUBDIVISION_CODE.test(code ?? '') || !code.startsWith(`${country}-`)) {
			uncoded[country] = (uncoded[country] ?? 0) + 1;
			continue;
		}
		if (!byCountry.has(country)) {
			byCountry.set(country, []);
		}
		const recode = RECODES.get(code);
		if (recode) {
			recoded.add(code);
		}
		byCountry.get(country).push(
			recode
				? {
						...f,
						properties: {
							...f.properties,
							iso_3166_2: recode[0],
							name: recode[1],
						},
					}
				: f,
		);
	}
	return { byCountry, uncoded, recoded };
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
	const topo = topology({ parts: { type: 'FeatureCollection', features } });
	const { geometries } = topo.objects.parts;
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

/** Lower-cased English names → code, for data that names a state. */
function namesOf(members) {
	const names = {};
	for (const { properties: p } of members) {
		for (const name of [p.name, p.name_en, p.gn_name, p.woe_name]) {
			if (name) {
				names[name.toLowerCase()] ??= p.iso_3166_2;
			}
		}
	}
	return names;
}

/**
 * Natural Earth admin-1 GeoJSON → `{ files, report }`, where `files` maps each
 * country with enough coded states to its outlines file, in code order.
 */
export function buildSubdivisions(source) {
	const { byCountry, uncoded, recoded } = groupByCountry(source.features);
	const files = new Map();
	const report = {
		skippedUnderMinimum: [],
		mergedParts: {},
		uncodedShapes: uncoded,
		droppedFlippedIslands: {},
		droppedCollapsedPolygons: 0,
		emptiedShapes: [],
		// Merge entries whose retired code Natural Earth no longer has.
		unmatchedRetiredCodes: [...RECODES.keys()].filter(
			(code) => !recoded.has(code),
		),
	};

	const countries = [...byCountry.keys()].sort((a, b) => a.localeCompare(b));
	for (const country of countries) {
		const members = byCountry.get(country);
		const { shapes, merged } = mergeByCode(members);
		if (shapes.length < MIN_SUBDIVISIONS) {
			report.skippedUnderMinimum.push(country);
			continue;
		}
		if (merged) {
			report.mergedParts[country] = merged;
		}
		const { topo, flipped, collapsed, emptied } = simplifyAndQuantize(
			'subdivisions',
			shapes,
			SUBDIVISION_MIN_WEIGHT,
			SUBDIVISION_QUANTIZATION,
		);
		if (flipped) {
			report.droppedFlippedIslands[country] = flipped;
		}
		report.droppedCollapsedPolygons += collapsed;
		report.emptiedShapes.push(...emptied);
		files.set(country, {
			...topo,
			aliases: aliasesOf(country),
			names: namesOf(members),
		});
	}
	return { files, report };
}
