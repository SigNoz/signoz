import { useCallback, useMemo, useRef, useState } from 'react';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { Zoom } from '@visx/zoom';
import type { GeoProjection } from 'd3-geo';
import { useResizeObserver } from 'hooks/useDimensions';

import CountryTooltip from './components/CountryTooltip/CountryTooltip';
import MapLegend from './components/MapLegend/MapLegend';
import MapStatus from './components/MapStatus/MapStatus';
import MapViewport from './components/MapViewport/MapViewport';
import { useGeoMapScales } from './hooks/useGeoMapScales';
import { useGeoMapShapes } from './hooks/useGeoMapShapes';
import { GeoMapProps } from './types';
import { constrainZoom, MAX_ZOOM } from './utils/zoom';

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
}: GeoMapProps): JSX.Element {
	const mapRef = useRef<HTMLDivElement>(null);
	const { width, height } = useResizeObserver(mapRef, 100);
	const [geoProjection, setGeoProjection] = useState<GeoProjection | null>(null);

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
	const constrain = useMemo(() => constrainZoom(width, height), [width, height]);

	// A projection is a function, so it must not be handed to setState as one.
	const handleProjection = useCallback((next: GeoProjection): void => {
		setGeoProjection(() => next);
	}, []);

	const handleHover = useCallback(
		(code: string | null, clientX: number, clientY: number): void => {
			const rect = mapRef.current?.getBoundingClientRect();
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
				onSelect({ datum, clientX, clientY });
			}
		},
		[valueByCode, onSelect],
	);

	const hovered =
		tooltipOpen && tooltipData ? valueByCode.get(tooltipData) : undefined;

	return (
		<div className={styles.wrapper} data-geo-map data-testid="geo-map">
			<div
				className={styles.mapArea}
				ref={(node): void => {
					(mapRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
					containerRef(node);
				}}
			>
				{status !== 'ready' && <MapStatus status={status} onRetry={retry} />}
				{width > 0 &&
					height > 0 &&
					shapes && (
						// Remounting on view, country or size change resets the zoom.
						<Zoom<SVGSVGElement>
							key={`${view}:${country ?? ''}:${width}x${height}`}
							width={width}
							height={height}
							scaleXMin={1}
							scaleXMax={MAX_ZOOM}
							scaleYMin={1}
							scaleYMax={MAX_ZOOM}
							constrain={constrain}
						>
							{(zoom): JSX.Element => (
								<MapViewport
									zoom={zoom}
									width={width}
									height={height}
									view={view}
									country={country}
									layer={layer}
									shapes={shapes}
									data={data}
									fillFor={fillFor}
									onProjection={handleProjection}
									geoProjection={geoProjection}
									hoveredCode={hovered?.code ?? null}
									radiusFor={radiusFor}
									onHover={handleHover}
									onSelect={handleSelect}
								/>
							)}
						</Zoom>
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
