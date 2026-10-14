import { useCallback, useEffect, useRef, useState } from 'react';
import View from 'ol/View';
import type { Extent } from 'ol/extent';

import { GeoMapDatum, GeoMapView, SubdivisionCountry } from '../types';
import { MAX_ZOOM, ZOOM_STEP } from '../utils/zoom';
import { getViewExtent } from '../utils/olFeatures';
import { OlMapHandle } from './useOlMap';

const PADDING = [8, 8, 8, 8];
const ZOOM_LEVELS = Math.log2(ZOOM_STEP);
const MAX_LEVELS = Math.log2(MAX_ZOOM);
const ANIMATION_MS = 200;

interface OlZoom {
	canZoomIn: boolean;
	canZoomOut: boolean;
	zoomIn: () => void;
	zoomOut: () => void;
	reset: () => void;
}

/**
 * Frames the view's box and holds the map inside it: no zooming out past the
 * fit, no panning off its edges. Refits on view, country or size change.
 */
export function useOlView(
	handle: OlMapHandle | null,
	view: GeoMapView,
	country: SubdivisionCountry | undefined,
	data: GeoMapDatum[],
	width: number,
	height: number,
): OlZoom {
	const extentRef = useRef<Extent | null>(null);
	const [zoom, setZoom] = useState({ current: 0, min: 0 });
	const fitData = view === 'fit' ? data : null;

	useEffect(() => {
		if (!handle || width === 0 || height === 0) {
			return undefined;
		}
		const extent = getViewExtent(view, fitData ?? [], country);
		extentRef.current = extent;
		const olView = new View({ extent, showFullExtent: true });
		handle.map.setView(olView);
		handle.map.updateSize();
		olView.fit(extent, { padding: PADDING });
		const min = olView.getZoom() ?? 0;
		olView.setMinZoom(min);
		olView.setMaxZoom(min + MAX_LEVELS);
		setZoom({ current: min, min });
		const sync = (): void => setZoom({ current: olView.getZoom() ?? min, min });
		olView.on('change:resolution', sync);
		return (): void => olView.un('change:resolution', sync);
	}, [handle, view, country, fitData, width, height]);

	const step = useCallback(
		(levels: number) => {
			const olView = handle?.map.getView();
			const current = olView?.getZoom();
			if (olView && current !== undefined) {
				olView.animate({ zoom: current + levels, duration: ANIMATION_MS });
			}
		},
		[handle],
	);

	return {
		canZoomIn: zoom.current < zoom.min + MAX_LEVELS - 0.01,
		canZoomOut: zoom.current > zoom.min + 0.01,
		zoomIn: (): void => step(ZOOM_LEVELS),
		zoomOut: (): void => step(-ZOOM_LEVELS),
		reset: (): void => {
			if (extentRef.current) {
				handle?.map
					.getView()
					.fit(extentRef.current, { padding: PADDING, duration: ANIMATION_MS });
			}
		},
	};
}
