// Invariants the chart relies on, checked before anything is written. A
// failure names every problem; the committed assets are left untouched.
import { feature } from 'topojson-client';

import { MIN_SUBDIVISIONS } from './config.mjs';

// Natural Earth v5.1.2 yields 239 countries and 198 countries with states. A
// drop below these means a changed or truncated download, not real geography.
const MIN_COUNTRIES = 230;
const MIN_SUBDIVISION_COUNTRIES = 190;

function duplicatesOf(values) {
	const seen = new Set();
	return values.filter((value) => seen.has(value) || !seen.add(value));
}

function checkCountries({ topology, lookups, report }, problems) {
	const shapes = feature(topology, topology.objects.countries).features;
	const codes = shapes.map((shape) => shape.properties.code).filter(Boolean);
	const drawn = new Set(codes);

	if (shapes.length < MIN_COUNTRIES) {
		problems.push(
			`only ${shapes.length} countries (expected ≥ ${MIN_COUNTRIES})`,
		);
	}
	if (report.emptied) {
		problems.push(`countries left with no outline: ${report.emptied}`);
	}
	for (const code of duplicatesOf(codes)) {
		problems.push(`country code ${code} is drawn twice`);
	}
	if (lookups.codes.join() !== [...drawn].sort().join()) {
		problems.push('lookups.codes differs from the drawn country codes');
	}
	for (const [alias, target] of Object.entries(lookups.aliases)) {
		if (!drawn.has(target)) {
			problems.push(`country alias ${alias} → ${target}, which has no shape`);
		}
	}
	for (const [alpha3, target] of Object.entries(lookups.alpha3)) {
		if (!drawn.has(target)) {
			problems.push(`alpha-3 ${alpha3} → ${target}, which has no shape`);
		}
	}
}

function checkSubdivisionFile(country, file, problems) {
	const codes = file.objects.subdivisions.geometries.map(
		(geometry) => geometry.properties.code,
	);
	const known = new Set(codes);

	if (codes.length < MIN_SUBDIVISIONS) {
		problems.push(
			`${country}: ${codes.length} states (expected ≥ ${MIN_SUBDIVISIONS})`,
		);
	}
	for (const code of duplicatesOf(codes)) {
		problems.push(`${country}: state code ${code} is drawn twice`);
	}
	for (const code of codes) {
		if (!code?.startsWith(`${country}-`)) {
			problems.push(`${country}: state code ${code} is outside the country`);
		}
	}
	for (const [alias, target] of Object.entries(file.aliases)) {
		if (!known.has(target)) {
			problems.push(`${country}: alias ${alias} → ${target}, which has no shape`);
		}
	}
	for (const [name, code] of Object.entries(file.names)) {
		if (!known.has(code)) {
			problems.push(`${country}: name "${name}" → ${code}, which has no shape`);
		}
	}
}

function checkSubdivisions({ files, report }, problems) {
	if (files.size < MIN_SUBDIVISION_COUNTRIES) {
		problems.push(
			`only ${files.size} countries with states (expected ≥ ${MIN_SUBDIVISION_COUNTRIES})`,
		);
	}
	if (report.emptiedShapes.length > 0) {
		problems.push(
			`states left with no outline: ${report.emptiedShapes.join(' ')}`,
		);
	}
	if (report.unmatchedRetiredCodes.length > 0) {
		problems.push(
			`merge codes not found in Natural Earth: ${report.unmatchedRetiredCodes.join(' ')}`,
		);
	}
	for (const [country, file] of files) {
		checkSubdivisionFile(country, file, problems);
	}
}

/** Throws one error listing every broken invariant. */
export function validate(countries, subdivisions) {
	const problems = [];
	checkCountries(countries, problems);
	checkSubdivisions(subdivisions, problems);
	if (problems.length > 0) {
		throw new Error(
			`${problems.length} problem(s) in the generated outlines:\n- ${problems.join('\n- ')}`,
		);
	}
}
