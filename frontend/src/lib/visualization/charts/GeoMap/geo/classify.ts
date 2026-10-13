import type { ParsedFeature } from '@visx/geo/lib/projections/Projection';

import { GeoMapDatum, ShapeFeature } from '../types';

interface PathBounds {
	bounds: (object: ShapeFeature) => [[number, number], [number, number]];
}

export interface ClassifiedFeatures {
	members: ParsedFeature<ShapeFeature>[];
	context: ParsedFeature<ShapeFeature>[];
}

/** Non-members are drawn as context only where they land inside the panel. */
export function classifyFeatures(
	features: ParsedFeature<ShapeFeature>[],
	path: PathBounds,
	isMember: (shape: ShapeFeature) => boolean,
	width: number,
	height: number,
): ClassifiedFeatures {
	const members: ParsedFeature<ShapeFeature>[] = [];
	const context: ParsedFeature<ShapeFeature>[] = [];
	features.forEach((parsed) => {
		if (!parsed.path) {
			return;
		}
		if (isMember(parsed.feature)) {
			members.push(parsed);
			return;
		}
		const [[x0, y0], [x1, y1]] = path.bounds(parsed.feature);
		if (x1 > 0 && y1 > 0 && x0 < width && y0 < height) {
			context.push(parsed);
		}
	});
	return { members, context };
}

/** Values the view can't show: no member shape carries their code. */
export function getOutsideView(
	data: GeoMapDatum[],
	byCode: Map<string, ShapeFeature>,
	isMember: (shape: ShapeFeature) => boolean,
): GeoMapDatum[] {
	return data.filter((datum) => {
		const shape = byCode.get(datum.code);
		return !shape || !isMember(shape);
	});
}
