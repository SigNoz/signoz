import { useEffect, useMemo } from 'react';
import Feature from 'ol/Feature';
import { Fill, Stroke, Style } from 'ol/style';

import { GeoMapShapes } from '../geo/shapes';
import { GeoMapDatum, GeoMapLayer } from '../types';
import { toBubbleFeatures, toShapeFeatures } from '../utils/olFeatures';
import { createStyleCache, OlPalette } from '../utils/olStyles';
import { OlMapHandle } from './useOlMap';

interface UseOlLayersArgs {
	handle: OlMapHandle | null;
	shapes: GeoMapShapes | null;
	data: GeoMapDatum[];
	layer: GeoMapLayer;
	palette: OlPalette | null;
	fillFor: (code: string) => string | null;
	/** What each bubble is sized by; codes without one draw no bubble. */
	sizeByCode: Map<string, number>;
	radiusFor: (size: number) => number;
	/** Adds neutral, size-only bubbles over the shaded regions. */
	hasSizeMetric?: boolean;
	hoveredCode: string | null;
}

/** Keeps the map's layers in step with shapes, data, theme and hover. */
export function useOlLayers({
	handle,
	shapes,
	data,
	layer,
	palette,
	fillFor,
	sizeByCode,
	radiusFor,
	hasSizeMetric = false,
	hoveredCode,
}: UseOlLayersArgs): void {
	// Cached styles bake in the palette, so a theme change starts a fresh cache.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const styles = useMemo(() => createStyleCache(), [palette]);
	const showBubbles = layer === 'bubbles' || hasSizeMetric;

	useEffect(() => {
		if (!handle || !shapes) {
			return;
		}
		const { members, context } = toShapeFeatures(shapes);
		const { layers } = handle;
		layers.members.getSource()?.clear();
		layers.members.getSource()?.addFeatures(members);
		layers.context.getSource()?.clear();
		layers.context.getSource()?.addFeatures(context);
	}, [handle, shapes]);

	useEffect(() => {
		if (!handle || !shapes) {
			return;
		}
		const source = handle.layers.bubbles.getSource();
		source?.clear();
		if (showBubbles) {
			source?.addFeatures(
				toBubbleFeatures(
					data.filter((datum) => sizeByCode.has(datum.code)),
					shapes,
				),
			);
		}
	}, [handle, shapes, data, showBubbles, sizeByCode]);

	useEffect(() => {
		if (!handle || !palette) {
			return;
		}
		const { layers } = handle;
		layers.context.setStyle(styles.shape(palette.context, palette));
		layers.members.setStyle((feature): Style => {
			const code = feature.get('code') as string | null;
			const fill = layer === 'regions' && code ? fillFor(code) : null;
			return styles.shape(fill ?? palette.noData, palette);
		});
		layers.bubbles.setStyle((feature): Style => {
			const code = feature.get('code') as string;
			const radius = radiusFor(sizeByCode.get(code) ?? 0);
			if (layer === 'regions') {
				return styles.neutralBubble(radius, palette);
			}
			return styles.bubble(fillFor(code) ?? palette.noData, radius, palette);
		});
		layers.hover.setStyle(
			new Style({
				stroke: new Stroke({ color: palette.outline, width: 1.5 }),
				fill: new Fill({ color: 'transparent' }),
			}),
		);
	}, [handle, palette, layer, fillFor, radiusFor, sizeByCode, styles]);

	useEffect(() => {
		if (!handle) {
			return;
		}
		const source = handle.layers.hover.getSource();
		source?.clear();
		if (!hoveredCode) {
			return;
		}
		const shape = handle.layers.members
			.getSource()
			?.getFeatures()
			.find((feature) => feature.get('code') === hoveredCode);
		if (shape) {
			source?.addFeature(new Feature(shape.getGeometry()?.clone()));
		}
	}, [handle, hoveredCode, shapes]);
}
