import { useEffect, useMemo } from 'react';
import type { ParsedFeature } from '@visx/geo/lib/projections/Projection';
import type { GeoProjection } from 'd3-geo';

import { classifyFeatures } from '../../geo/classify';
import { GeoMapDatum, GeoMapLayer, ShapeFeature } from '../../types';

import styles from './ShapesLayer.module.scss';

interface ShapePathsProps {
	features: ParsedFeature<ShapeFeature>[];
	path: {
		bounds: (object: ShapeFeature) => [[number, number], [number, number]];
	};
	projection: GeoProjection;
	isMember: (shape: ShapeFeature) => boolean;
	nameOf: (code: string) => string;
	layer: GeoMapLayer;
	data: GeoMapDatum[];
	width: number;
	height: number;
	fillFor: (code: string) => string | null;
	onProjection: (projection: GeoProjection) => void;
}

export default function ShapePaths({
	features,
	path,
	projection,
	isMember,
	nameOf,
	layer,
	data,
	width,
	height,
	fillFor,
	onProjection,
}: ShapePathsProps): JSX.Element {
	useEffect(() => onProjection(projection), [projection, onProjection]);

	const { members, context } = useMemo(
		() => classifyFeatures(features, path, isMember, width, height),
		[features, path, isMember, width, height],
	);

	const codesWithData = useMemo(
		() => new Set(data.map((datum) => datum.code)),
		[data],
	);

	const showFills = layer === 'regions';

	return (
		<g>
			<g className={styles.context} data-testid="geo-map-context">
				{context.map(({ feature, path: d }) => (
					<path key={feature.id ?? feature.properties.name} d={d ?? ''} />
				))}
			</g>
			<g className={styles.members} data-testid="geo-map-members">
				{members.map(({ feature, path: d }) => {
					const { code, name } = feature.properties;
					const interactive = showFills && code !== null && codesWithData.has(code);
					const fill = interactive && code ? fillFor(code) : null;
					return (
						<path
							key={feature.id ?? name}
							d={d ?? ''}
							data-code={code ?? undefined}
							className={fill ? styles.hasData : styles.noData}
							style={fill ? { fill } : undefined}
							tabIndex={interactive ? 0 : undefined}
							role={interactive ? 'graphics-symbol' : undefined}
							aria-label={interactive && code ? nameOf(code) : undefined}
						/>
					);
				})}
			</g>
		</g>
	);
}
