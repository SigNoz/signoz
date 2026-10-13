import { useMemo } from 'react';
import type { GeoProjection } from 'd3-geo';

import { GeoMapShapes } from '../../geo/shapes';
import { GeoMapDatum } from '../../types';

import styles from './BubblesLayer.module.scss';

interface BubblesLayerProps {
	data: GeoMapDatum[];
	projection: GeoProjection;
	shapes: GeoMapShapes;
	radiusFor: (value: number) => number;
	fillFor: (code: string) => string | null;
	/** Radii are divided by it so bubbles keep their screen size while zoomed. */
	zoomScale: number;
}

export default function BubblesLayer({
	data,
	projection,
	shapes,
	radiusFor,
	fillFor,
	zoomScale,
}: BubblesLayerProps): JSX.Element {
	const bubbles = useMemo(
		() =>
			data
				.map((datum) => {
					const shape = shapes.byCode.get(datum.code);
					if (!shape || !shapes.isMember(shape)) {
						return null;
					}
					const point = projection(shape.properties.label);
					return point ? { datum, point, radius: radiusFor(datum.value) } : null;
				})
				.filter((bubble): bubble is NonNullable<typeof bubble> => bubble !== null)
				.sort((a, b) => b.radius - a.radius),
		[data, projection, shapes, radiusFor],
	);

	return (
		<g data-testid="geo-map-bubbles">
			{bubbles.map(({ datum, point, radius }) => (
				<circle
					key={datum.code}
					cx={point[0]}
					cy={point[1]}
					r={radius / zoomScale}
					data-code={datum.code}
					className={datum.value < 0 ? styles.bubbleNegative : styles.bubble}
					style={{ fill: fillFor(datum.code) ?? undefined }}
					tabIndex={0}
					role="graphics-symbol"
					aria-label={shapes.nameOf(datum.code)}
				/>
			))}
		</g>
	);
}
