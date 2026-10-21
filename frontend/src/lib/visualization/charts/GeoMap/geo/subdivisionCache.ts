import type { SubdivisionSet } from './subdivisions';

// Its own module so data code can read loaded states without importing the loader.
const loaded = new Map<string, SubdivisionSet>();

export function rememberSubdivisions(set: SubdivisionSet): void {
	loaded.set(set.country, set);
}

/** A country's states if a map has loaded them this session; never loads them. */
export function getLoadedSubdivisions(
	country: string | null | undefined,
): SubdivisionSet | null {
	return (country && loaded.get(country)) || null;
}
