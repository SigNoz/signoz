import { GeoMapDatum, GeoMapSizeMetric } from '../../types';

export interface TooltipStat {
	label: string;
	value: string;
	testId?: string;
}

/**
 * The rows under the value: the row's other values when the caller supplies
 * them, else the size metric when the map has one.
 */
export function buildTooltipStats({
	datum,
	sizeMetric,
}: {
	datum: GeoMapDatum;
	sizeMetric: GeoMapSizeMetric | undefined;
}): TooltipStat[] {
	if (datum.details) {
		return datum.details;
	}
	if (!sizeMetric) {
		return [];
	}
	const { size } = datum;
	return [
		{
			label: sizeMetric.label,
			value:
				size != null && Number.isFinite(size) ? sizeMetric.formatValue(size) : '—',
			testId: 'geo-map-tooltip-size',
		},
	];
}
