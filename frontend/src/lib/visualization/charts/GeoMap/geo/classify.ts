import { GeoMapDatum, ShapeFeature } from '../types';

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
