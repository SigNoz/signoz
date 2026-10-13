import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import { ShapeFeature, ShapeProperties, SubdivisionCountry } from '../types';

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

// One chunk per country, so a world map never downloads any of them. Keyed by
// `SubdivisionCountry`, so a country added to one and not the other won't compile.
const LOADERS: Record<SubdivisionCountry, () => Promise<{ default: unknown }>> =
	{
		US: () => import('../assets/subdivisions/US.json'),
		IN: () => import('../assets/subdivisions/IN.json'),
	};

export const SUBDIVISION_COUNTRIES = Object.keys(
	LOADERS,
) as SubdivisionCountry[];

/** Narrows a spec's or user's country code to one whose states ship with the chart. */
export function isSubdivisionCountry(
	code: string | null | undefined,
): code is SubdivisionCountry {
	return (
		Boolean(code) && Object.prototype.hasOwnProperty.call(LOADERS, code as string)
	);
}

const cache = new Map<SubdivisionCountry, Promise<SubdivisionSet>>();

async function load(country: SubdivisionCountry): Promise<SubdivisionSet> {
	const file = (await LOADERS[country]()).default as SubdivisionFile;
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
