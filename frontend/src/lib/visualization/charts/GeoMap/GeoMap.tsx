import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { useResizeObserver } from 'hooks/useDimensions';

import CountryTooltip from './components/CountryTooltip/CountryTooltip';
import MapLegend from './components/MapLegend/MapLegend';
import MapStatus from './components/MapStatus/MapStatus';
import ZoomControls from './components/ZoomControls/ZoomControls';
import { useGeoMapScales } from './hooks/useGeoMapScales';
import { useGeoMapShapes } from './hooks/useGeoMapShapes';
import { formatCoordinates } from './utils/coordinates';
import { pointAsDatum } from './utils/scales';
import { GeoMapProps } from './types';
import { useOlLayers } from './hooks/useOlLayers';
import { useOlMap } from './hooks/useOlMap';
import { useOlPointer } from './hooks/useOlPointer';
import { useOlPointsLayer } from './hooks/useOlPointsLayer';
import { useOlView } from './hooks/useOlView';
import { OlPalette, readPalette } from './utils/olStyles';

import styles from './GeoMap.module.scss';

export default function GeoMap({
	data,
	points,
	view,
	country,
	layer,
	colors,
	bubbleRadius,
	formatValue,
	valueLabel,
	sizeMetric,
	showLabels = true,
	colorKeys,
	isDarkMode,
	onSelect,
	renderTooltipFooter,
}: GeoMapProps): JSX.Element {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const mapAreaRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	const { width, height } = useResizeObserver(mapAreaRef, 100);
	const [palette, setPalette] = useState<OlPalette | null>(null);

	const {
		tooltipOpen,
		tooltipLeft,
		tooltipTop,
		tooltipData,
		showTooltip,
		hideTooltip,
	} = useTooltip<string>();
	const { containerRef, TooltipInPortal } = useTooltipInPortal({
		scroll: true,
		detectBounds: true,
	});

	// On the points layer the scales colour and size points, keyed by point id.
	const scaleData = useMemo(
		() => (layer === 'points' ? (points ?? []).map(pointAsDatum) : data),
		[layer, points, data],
	);
	const { resolver, valueByCode, ranks, sizeByCode, radiusFor, fillFor } =
		useGeoMapScales(
			scaleData,
			colors,
			bubbleRadius,
			isDarkMode,
			Boolean(sizeMetric),
		);
	const maxSize = useMemo(
		() => [...sizeByCode.values()].reduce((max, size) => Math.max(max, size), 0),
		[sizeByCode],
	);
	const { shapes, status, retry } = useGeoMapShapes(view, country);
	const handle = useOlMap(canvasRef);
	const pointsLayer = useOlPointsLayer(handle, layer === 'points');

	useEffect(() => {
		if (wrapperRef.current) {
			setPalette(readPalette(wrapperRef.current));
		}
	}, [isDarkMode]);

	const handleHover = useCallback(
		(code: string | null, clientX: number, clientY: number): void => {
			const rect = mapAreaRef.current?.getBoundingClientRect();
			if (!code || !rect || !valueByCode.has(code)) {
				hideTooltip();
				return;
			}
			showTooltip({
				tooltipData: code,
				tooltipLeft: clientX - rect.left,
				tooltipTop: clientY - rect.top,
			});
		},
		[valueByCode, showTooltip, hideTooltip],
	);

	const pointById = useMemo(
		() =>
			new Map(
				(layer === 'points' ? (points ?? []) : []).map((point) => [
					point.id,
					point,
				]),
			),
		[layer, points],
	);

	const handleSelect = useCallback(
		(code: string, clientX: number, clientY: number): void => {
			const datum = valueByCode.get(code);
			if (datum && onSelect) {
				hideTooltip();
				onSelect({ datum, point: pointById.get(code), clientX, clientY });
			}
		},
		[valueByCode, pointById, onSelect, hideTooltip],
	);

	const hovered =
		tooltipOpen && tooltipData ? valueByCode.get(tooltipData) : undefined;
	const hoveredPoint = hovered ? pointById.get(hovered.code) : undefined;

	useOlLayers({
		handle,
		shapes,
		data,
		points,
		pointsLayer,
		layer,
		palette,
		fillFor,
		sizeByCode,
		radiusFor,
		hasSizeMetric: Boolean(sizeMetric),
		showLabels,
		hoveredCode: hovered?.code ?? null,
	});
	const zoom = useOlView(
		handle,
		view,
		country,
		data,
		width,
		height,
		layer === 'points' ? points : undefined,
	);
	useOlPointer(handle, handleHover, handleSelect, pointsLayer.layer);

	return (
		<div
			className={styles.wrapper}
			ref={wrapperRef}
			data-geo-map
			data-testid="geo-map"
		>
			<div
				className={styles.mapArea}
				ref={(node): void => {
					(mapAreaRef as React.MutableRefObject<HTMLDivElement | null>).current =
						node;
					containerRef(node);
				}}
			>
				<div
					ref={canvasRef}
					className={styles.canvas}
					data-testid="geo-map-canvas"
				/>
				{status !== 'ready' && <MapStatus status={status} onRetry={retry} />}
				{status === 'ready' && (
					<ZoomControls
						canZoomIn={zoom.canZoomIn}
						canZoomOut={zoom.canZoomOut}
						onZoomIn={zoom.zoomIn}
						onZoomOut={zoom.zoomOut}
						onReset={zoom.reset}
					/>
				)}
				{hovered && (
					<TooltipInPortal
						left={tooltipLeft}
						top={tooltipTop}
						className={styles.tooltip}
						unstyled
						applyPositionStyle
					>
						<CountryTooltip
							datum={hovered}
							name={
								hoveredPoint?.label ?? shapes?.nameOf(hovered.code) ?? hovered.code
							}
							place={
								hoveredPoint && formatCoordinates(hoveredPoint.lat, hoveredPoint.lon)
							}
							color={fillFor(hovered.code) ?? resolver.colorFor(hovered.value)}
							rank={ranks.get(hovered.code)}
							total={scaleData.length}
							formatValue={formatValue}
							valueLabel={valueLabel}
							sizeMetric={sizeMetric}
							footer={renderTooltipFooter?.()}
						/>
					</TooltipInPortal>
				)}
			</div>
			<MapLegend
				resolver={resolver}
				scale={colors.scale}
				formatValue={formatValue}
				markerValue={hovered?.value ?? null}
				valueLabel={valueLabel}
				colorKeys={colorKeys}
				size={
					sizeMetric && {
						label: sizeMetric.label,
						maxSize,
						radiusFor,
						formatValue: sizeMetric.formatValue,
					}
				}
			/>
		</div>
	);
}
