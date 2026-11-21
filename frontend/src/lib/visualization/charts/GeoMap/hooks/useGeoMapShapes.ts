import { useMemo } from 'react';

import type { GeoMapShapes } from '../geo/shapes';
import { getCountryShapes, getSubdivisionShapes } from '../geo/shapes';
import type { GeoMapView, SubdivisionCountry } from '../types';
import type { SubdivisionStatus } from './useSubdivisionSet';
import { useSubdivisionSet } from './useSubdivisionSet';

export interface GeoMapShapesLoad {
	/** `null` until the view's shapes are available. */
	shapes: GeoMapShapes | null;
	status: Exclude<SubdivisionStatus, 'idle'>;
	retry: () => void;
}

/** The shapes a view draws; the country view loads that country's states first. */
export function useGeoMapShapes(
	view: GeoMapView,
	country: SubdivisionCountry | undefined,
): GeoMapShapesLoad {
	const isCountryView = view === 'country' && Boolean(country);
	const { set, status, retry } = useSubdivisionSet(
		isCountryView ? country : undefined,
	);

	const shapes = useMemo(() => {
		if (!isCountryView) {
			// A country view with no country picked yet shows the world.
			return getCountryShapes(view === 'country' ? 'world' : view);
		}
		return set ? getSubdivisionShapes(set) : null;
	}, [isCountryView, view, set]);

	return {
		shapes,
		status: isCountryView && status !== 'idle' ? status : 'ready',
		retry,
	};
}
