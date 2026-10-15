import { useEffect, useMemo } from 'react';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

import { GeoMapShapes } from '../geo/shapes';
import { GeoMapDatum, GeoMapLayer, GeoMapPoint } from '../types';
import {
	toBubbleFeatures,
	toLabelFeatures,
	toPointFeatures,
	toShapeFeatures,
} from '../utils/olFeatures';
import { labelFits } from '../utils/olLabels';
import {
	createStyleCache,
	MIN_OUTLINED_POINT_RADIUS,
	OlPalette,
} from '../utils/olStyles';
import { OlMapHandle } from './useOlMap';

interface UseOlLayersArgs {
	handle: OlMapHandle | null;
	shapes: GeoMapShapes | null;
	data: GeoMapDatum[];
	/** Drawn instead of bubbles on the `points` layer. */
	points?: GeoMapPoint[];
	layer: GeoMapLayer;
	palette: OlPalette | null;
	fillFor: (code: string) => string | null;
	/** What each bubble is sized by; codes without one draw no bubble. */
	sizeByCode: Map<string, number>;
	radiusFor: (size: number) => number;
	/** Adds neutral, size-only bubbles over the shaded regions. */
	hasSizeMetric?: boolean;
	showLabels?: boolean;
	hoveredCode: string | null;
}

/** Keeps the map's layers in step with shapes, data, theme and hover. */
export function useOlLayers({
	handle,
	shapes,
	data,
	points,
	layer,
	palette,
	fillFor,
	sizeByCode,
	radiusFor,
	hasSizeMetric = false,
	showLabels = true,
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
		layers.labels.getSource()?.clear();
		layers.labels.getSource()?.addFeatures(toLabelFeatures(shapes, members));
	}, [handle, shapes]);

	useEffect(() => {
		handle?.layers.labels.setVisible(showLabels);
	}, [handle, showLabels]);

	useEffect(() => {
		if (!handle || !shapes) {
			return;
		}
		const source = handle.layers.bubbles.getSource();
		source?.clear();
		if (layer === 'points') {
			source?.addFeatures(
				toPointFeatures((points ?? []).filter((point) => sizeByCode.has(point.id))),
			);
		} else if (showBubbles) {
			source?.addFeatures(
				toBubbleFeatures(
					data.filter((datum) => sizeByCode.has(datum.code)),
					shapes,
				),
			);
		}
	}, [handle, shapes, data, points, layer, showBubbles, sizeByCode]);

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
			return styles.bubble(
				fillFor(code) ?? palette.noData,
				radius,
				palette,
				layer !== 'points' || radius >= MIN_OUTLINED_POINT_RADIUS,
			);
		});
		layers.labels.setStyle((feature, resolution): Style | undefined => {
			const name = feature.get('name') as string;
			const box = feature.get('box') as [number, number];
			return labelFits(name, box, resolution)
				? styles.label(name, feature.get('area') as number, palette)
				: undefined;
		});
		const outline = new Stroke({ color: palette.outline, width: 1.5 });
		const shapeHover = new Style({
			stroke: outline,
			fill: new Fill({ color: 'transparent' }),
		});
		// A hovered point gets a ring just outside its circle.
		layers.hover.setStyle(
			(feature): Style =>
				feature.getGeometry() instanceof Point
					? new Style({
							image: new CircleStyle({
								radius: (feature.get('radius') as number) + 2,
								stroke: outline,
							}),
						})
					: shapeHover,
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
		if (layer === 'points') {
			const point = handle.layers.bubbles
				.getSource()
				?.getFeatures()
				.find((feature) => feature.get('code') === hoveredCode);
			if (point) {
				source?.addFeature(
					new Feature({
						geometry: point.getGeometry()?.clone(),
						radius: radiusFor(sizeByCode.get(hoveredCode) ?? 0),
					}),
				);
			}
			return;
		}
		const shape = handle.layers.members
			.getSource()
			?.getFeatures()
			.find((feature) => feature.get('code') === hoveredCode);
		if (shape) {
			source?.addFeature(new Feature(shape.getGeometry()?.clone()));
		}
	}, [handle, hoveredCode, shapes, layer, radiusFor, sizeByCode]);
}
