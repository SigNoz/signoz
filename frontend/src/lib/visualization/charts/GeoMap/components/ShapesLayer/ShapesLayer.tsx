import { memo, useMemo } from 'react';
import { CustomProjection } from '@visx/geo';
import type { GeoProjection } from 'd3-geo';

import { GeoMapShapes } from '../../geo/shapes';
import { getGeoMapFit } from '../../geo/views';
import {
	GeoMapDatum,
	GeoMapLayer,
	GeoMapView,
	ShapeFeature,
	SubdivisionCountry,
} from '../../types';
import ShapePaths from './ShapePaths';

export interface ShapesLayerProps {
	width: number;
	height: number;
	view: GeoMapView;
	country?: SubdivisionCountry;
	layer: GeoMapLayer;
	data: GeoMapDatum[];
	shapes: GeoMapShapes;
	fillFor: (code: string) => string | null;
	onProjection: (projection: GeoProjection) => void;
}

const PADDING = 8;

/**
 * Country or state paths. Re-renders only when data, view or size change; hover
 * and zoom never regenerate the paths.
 */
function ShapesLayer({
	width,
	height,
	view,
	country,
	layer,
	data,
	shapes,
	fillFor,
	onProjection,
}: ShapesLayerProps): JSX.Element {
	const fit = useMemo(
		() => getGeoMapFit(view, view === 'fit' ? data : [], country),
		[view, data, country],
	);
	const isMercator = fit.projection === 'mercator';

	return (
		<CustomProjection<ShapeFeature>
			projection={fit.projection}
			data={shapes.shapes}
			rotate={isMercator ? fit.rotate : undefined}
			fitExtent={[
				[
					[PADDING, PADDING],
					[width - PADDING, height - PADDING],
				],
				fit.object,
			]}
			clipExtent={
				isMercator
					? [
							[0, 0],
							[width, height],
						]
					: undefined
			}
		>
			{({ features, path, projection }): JSX.Element => (
				<ShapePaths
					features={features}
					path={path}
					projection={projection}
					isMember={shapes.isMember}
					nameOf={shapes.nameOf}
					layer={layer}
					data={data}
					width={width}
					height={height}
					fillFor={fillFor}
					onProjection={onProjection}
				/>
			)}
		</CustomProjection>
	);
}

export default memo(ShapesLayer);
