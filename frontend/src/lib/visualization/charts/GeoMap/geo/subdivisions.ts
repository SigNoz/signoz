import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import { ShapeFeature, ShapeProperties, SubdivisionCountry } from '../types';
import { SUBDIVISION_COUNTRY_CODES } from './subdivisionCountries';

type SubdivisionFile = Topology<{
	subdivisions: GeometryCollection<ShapeProperties>;
}> & {
	/** Other ISO 3166-2 spellings (newer or retired) → the code a shape carries. */
	aliases: Record<string, string>;
	/** Lower-cased English names → code. */
	names: Record<string, string>;
};

export interface SubdivisionSet {
	country: SubdivisionCountry;
	shapes: ShapeFeature[];
	codes: Set<string>;
	aliases: Record<string, string>;
	names: Record<string, string>;
}

export const SUBDIVISION_COUNTRIES: readonly SubdivisionCountry[] =
	SUBDIVISION_COUNTRY_CODES;

const SUBDIVISION_COUNTRY_SET = new Set<string>(SUBDIVISION_COUNTRY_CODES);

/** Narrows a spec's or user's country code to one whose states ship with the chart. */
export function isSubdivisionCountry(
	code: string | null | undefined,
): code is SubdivisionCountry {
	return typeof code === 'string' && SUBDIVISION_COUNTRY_SET.has(code);
}

// The bundler splits every file the pattern matches into its own chunk, so a
// world map never downloads any of them.
function importSubdivisions(
	country: SubdivisionCountry,
): Promise<{ default: unknown }> {
	return import(`../assets/subdivisions/${country}.json`);
}

const cache = new Map<SubdivisionCountry, Promise<SubdivisionSet>>();

async function load(country: SubdivisionCountry): Promise<SubdivisionSet> {
	const file = (await importSubdivisions(country)).default as SubdivisionFile;
	const shapes = feature(file, file.objects.subdivisions)
		.features as ShapeFeature[];
	return {
		country,
		shapes,
		codes: new Set(shapes.map((shape) => shape.properties.code as string)),
		aliases: file.aliases,
		names: file.names,
	};
}

/**
 * Decoded once per country per session. A failed load is forgotten so the next
 * attempt fetches again.
 */
export function loadSubdivisions(
	country: SubdivisionCountry,
): Promise<SubdivisionSet> {
	let pending = cache.get(country);
	if (!pending) {
		pending = load(country).catch((error: unknown) => {
			cache.delete(country);
			throw error;
		});
		cache.set(country, pending);
	}
	return pending;
}
