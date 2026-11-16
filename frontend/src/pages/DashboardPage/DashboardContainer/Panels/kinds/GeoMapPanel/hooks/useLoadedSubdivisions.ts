import { loadedSubdivisionsStore } from 'lib/visualization/charts/GeoMap/geo/subdivisionCache';
import type { SubdivisionSet } from 'lib/visualization/charts/GeoMap/geo/subdivisions';
import { useStore } from 'zustand';

/**
 * A country's states once the map has loaded them. The map owns loading and
 * retry, so a retried load reaches every reader.
 */
export function useLoadedSubdivisions(
	country: string | undefined,
): SubdivisionSet | null {
	return useStore(
		loadedSubdivisionsStore,
		(loaded) => (country && loaded[country]) || null,
	);
}
