import { GeoMapDatum, GeoMapSizeMetric } from '../../types';
import { GeoMapRank } from '../../utils/scales';

export interface TooltipStat {
	label: string;
	value: string;
	testId?: string;
}

/** The rows under the value: the size metric first when the map has one, then rank and share. */
export function buildTooltipStats({
	datum,
	rank,
	total,
	sizeMetric,
}: {
	datum: GeoMapDatum;
	rank: GeoMapRank | undefined;
	total: number;
	sizeMetric: GeoMapSizeMetric | undefined;
}): TooltipStat[] {
	const stats: TooltipStat[] = [];
	if (sizeMetric) {
		const { size } = datum;
		stats.push({
			label: sizeMetric.label,
			value:
				size != null && Number.isFinite(size) ? sizeMetric.formatValue(size) : '—',
			testId: 'geo-map-tooltip-size',
		});
	}
	if (rank) {
		stats.push(
			{ label: 'Rank', value: `#${rank.rank} of ${total}` },
			{ label: 'Share of total', value: `${(rank.share * 100).toFixed(1)}%` },
		);
	}
	return stats;
}
