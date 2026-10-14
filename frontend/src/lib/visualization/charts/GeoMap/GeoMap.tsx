import { useCallback, useEffect, useRef, useState } from 'react';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { useResizeObserver } from 'hooks/useDimensions';

import CountryTooltip from './components/CountryTooltip/CountryTooltip';
import MapLegend from './components/MapLegend/MapLegend';
import MapStatus from './components/MapStatus/MapStatus';
import ZoomControls from './components/ZoomControls/ZoomControls';
import { useGeoMapScales } from './hooks/useGeoMapScales';
import { useGeoMapShapes } from './hooks/useGeoMapShapes';
import { GeoMapProps } from './types';
import { useOlLayers } from './hooks/useOlLayers';
import { useOlMap } from './hooks/useOlMap';
import { useOlPointer } from './hooks/useOlPointer';
import { useOlView } from './hooks/useOlView';
import { OlPalette, readPalette } from './utils/olStyles';

import styles from './GeoMap.module.scss';

export default function GeoMap({
	data,
	view,
	country,
	layer,
	colors,
	bubbleRadius,
	formatValue,
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

	const { resolver, valueByCode, ranks, radiusFor, fillFor } = useGeoMapScales(
		data,
		colors,
		bubbleRadius,
		isDarkMode,
	);
	const { shapes, status, retry } = useGeoMapShapes(view, country);
	const handle = useOlMap(canvasRef);

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

	const handleSelect = useCallback(
		(code: string, clientX: number, clientY: number): void => {
			const datum = valueByCode.get(code);
			if (datum && onSelect) {
				hideTooltip();
				onSelect({ datum, clientX, clientY });
			}
		},
		[valueByCode, onSelect, hideTooltip],
	);

	const hovered =
		tooltipOpen && tooltipData ? valueByCode.get(tooltipData) : undefined;

	useOlLayers({
		handle,
		shapes,
		data,
		layer,
		palette,
		fillFor,
		radiusFor,
		hoveredCode: hovered?.code ?? null,
	});
	const zoom = useOlView(handle, view, country, data, width, height);
	useOlPointer(handle, handleHover, handleSelect);

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
							name={shapes?.nameOf(hovered.code) ?? hovered.code}
							color={resolver.colorFor(hovered.value)}
							rank={ranks.get(hovered.code)}
							total={data.length}
							formatValue={formatValue}
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
			/>
		</div>
	);
}
