import { useRef } from 'react';
import type { ProvidedZoom, TransformMatrix } from '@visx/zoom/lib/types';
import cx from 'classnames';
import { geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';

import { useCtrlWheelZoom } from '../../hooks/useCtrlWheelZoom';
import { useGeoMapPointer } from '../../hooks/useGeoMapPointer';
import { MAX_ZOOM, ZOOM_STEP } from '../../utils/zoom';
import BubblesLayer from '../BubblesLayer/BubblesLayer';
import ShapesLayer, { ShapesLayerProps } from '../ShapesLayer/ShapesLayer';
import ZoomControls from '../ZoomControls/ZoomControls';

import styles from './MapViewport.module.scss';

interface MapViewportProps extends ShapesLayerProps {
	zoom: ProvidedZoom<SVGSVGElement> & {
		transformMatrix: TransformMatrix;
		isDragging: boolean;
	};
	geoProjection: GeoProjection | null;
	hoveredCode: string | null;
	radiusFor: (value: number) => number;
	onHover: (code: string | null, clientX: number, clientY: number) => void;
	onSelect: (code: string, clientX: number, clientY: number) => void;
}

/** The zoomable SVG: shapes, bubbles and the hover outline under one transform. */
export default function MapViewport({
	zoom,
	geoProjection,
	hoveredCode,
	radiusFor,
	onHover,
	onSelect,
	...layer
}: MapViewportProps): JSX.Element {
	const svgRef = useRef<SVGSVGElement>(null);
	useCtrlWheelZoom(svgRef, zoom.handleWheel);
	const handlers = useGeoMapPointer(zoom, onHover, onSelect);

	const { width, height, shapes, data, fillFor } = layer;
	const scale = zoom.transformMatrix.scaleX;
	const centre = { x: width / 2, y: height / 2 };

	const hoveredShape = hoveredCode ? shapes.byCode.get(hoveredCode) : undefined;
	const hoverOutline =
		hoveredShape && geoProjection ? geoPath(geoProjection)(hoveredShape) : null;

	return (
		<>
			<svg
				ref={svgRef}
				width={width}
				height={height}
				className={cx(styles.svg, {
					[styles.pannable]: scale > 1,
					[styles.panning]: zoom.isDragging,
				})}
				data-testid="geo-map-surface"
				{...handlers}
			>
				<g transform={zoom.toString()} data-testid="geo-map-zoom-layer">
					<ShapesLayer {...layer} />
					{layer.layer === 'bubbles' && geoProjection && (
						<BubblesLayer
							data={data}
							projection={geoProjection}
							shapes={shapes}
							radiusFor={radiusFor}
							fillFor={fillFor}
							zoomScale={scale}
						/>
					)}
					{hoverOutline && (
						<path
							d={hoverOutline}
							className={styles.hoverOutline}
							data-testid="geo-map-hover-outline"
						/>
					)}
				</g>
			</svg>
			<ZoomControls
				canZoomIn={scale < MAX_ZOOM}
				canZoomOut={scale > 1}
				onZoomIn={(): void =>
					zoom.scale({ scaleX: ZOOM_STEP, scaleY: ZOOM_STEP, point: centre })
				}
				onZoomOut={(): void =>
					zoom.scale({ scaleX: 1 / ZOOM_STEP, scaleY: 1 / ZOOM_STEP, point: centre })
				}
				onReset={zoom.reset}
			/>
		</>
	);
}
