import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import View from 'ol/View';
import type { Coordinate } from 'ol/coordinate';
import type { Extent } from 'ol/extent';

import {
	GeoMapDatum,
	GeoMapPoint,
	GeoMapProjection,
	GeoMapView,
	SubdivisionCountry,
} from '../types';
import { MAX_ZOOM, ZOOM_STEP } from '../utils/zoom';
import { getViewExtent } from '../utils/olFeatures';
import { toOlProjection } from '../utils/olProjections';
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

/** Fits the extent and bounds zooming to it: never out past the fit. */
function frame(olView: View, extent: Extent): void {
	// The previous floor would stop a shrunk panel from zooming out to fit.
	olView.setMinZoom(0);
	olView.fit(extent, { padding: PADDING });
	const min = olView.getZoom() ?? 0;
	olView.setMaxZoom(min + MAX_LEVELS);
	olView.setMinZoom(min);
}

interface Fitted {
	center: Coordinate;
	resolution: number;
}

function snapshot(olView: View): Fitted | null {
	const center = olView.getCenter();
	const resolution = olView.getResolution();
	return center && resolution ? { center, resolution } : null;
}

/** Whether the view still shows the last fitted frame, to within a pixel. */
function isAtFrame(olView: View, fitted: Fitted | null): boolean {
	const now = snapshot(olView);
	if (!fitted || !now) {
		return true;
	}
	return (
		Math.abs(now.resolution / fitted.resolution - 1) < 1e-3 &&
		Math.abs(now.center[0] - fitted.center[0]) < fitted.resolution &&
		Math.abs(now.center[1] - fitted.center[1]) < fitted.resolution
	);
}

/**
 * Frames the view's box and holds the map inside it: no zooming out past the
 * fit, no panning off its edges. Refits on view, projection, country or a
 * change in the framed box; a resize refits only while the user hasn't moved
 * the map.
 */
export function useOlView(
	handle: OlMapHandle | null,
	view: GeoMapView,
	projection: GeoMapProjection,
	country: SubdivisionCountry | undefined,
	data: GeoMapDatum[],
	width: number,
	height: number,
	/** Framed instead of `data` by Fit to data on the points layer. */
	points?: GeoMapPoint[],
): OlZoom {
	const extentRef = useRef<Extent | null>(null);
	const fittedRef = useRef<Fitted | null>(null);
	const [zoom, setZoom] = useState({ current: 0, min: 0 });
	const fitData = view === 'fit' ? data : null;
	const fitPoints = view === 'fit' ? points : undefined;
	const hasSize = width > 0 && height > 0;

	const fittedKey = useMemo(
		() =>
			getViewExtent(view, projection, fitData ?? [], country, fitPoints).join(','),
		[view, projection, fitData, country, fitPoints],
	);
	// Keyed by value so a refetch framing the same box keeps the user's zoom.
	const extent = useMemo(
		() => fittedKey.split(',').map(Number) as Extent,
		[fittedKey],
	);

	const refit = useCallback((olView: View): void => {
		if (!extentRef.current) {
			return;
		}
		frame(olView, extentRef.current);
		fittedRef.current = snapshot(olView);
		setZoom({ current: olView.getZoom() ?? 0, min: olView.getMinZoom() });
	}, []);

	useEffect(() => {
		if (!handle || !hasSize) {
			return undefined;
		}
		extentRef.current = extent;
		const olView = new View({
			extent,
			showFullExtent: true,
			projection: toOlProjection(projection),
		});
		handle.map.setView(olView);
		handle.map.updateSize();
		refit(olView);
		const sync = (): void =>
			setZoom({ current: olView.getZoom() ?? 0, min: olView.getMinZoom() });
		olView.on('change:resolution', sync);
		return (): void => olView.un('change:resolution', sync);
	}, [handle, hasSize, extent, projection, refit]);

	useEffect(() => {
		if (!handle || !hasSize) {
			return;
		}
		handle.map.updateSize();
		const olView = handle.map.getView();
		const moved = isAtFrame(olView, fittedRef.current) ? null : snapshot(olView);
		refit(olView);
		if (moved) {
			olView.setCenter(moved.center);
			olView.setResolution(moved.resolution);
		}
	}, [handle, hasSize, width, height, refit]);

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
