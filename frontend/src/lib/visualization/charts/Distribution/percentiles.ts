import { DistributionXAxis } from './types';

export interface DistributionPercentile {
	/** 0–100, as configured. */
	percentile: number;
	/** The estimate; in overflow, the last finite bound it is known to exceed. */
	value: number;
	/** Where the marker is drawn, in x-scale space. */
	axisValue: number;
	isOverflow: boolean;
}

/**
 * Percentiles of the summed counts, by `histogram_quantile`'s method: find the bucket
 * holding the target rank and interpolate linearly inside it, with the lowest bucket
 * starting at zero. So the values match a time-series panel's percentiles.
 */
export function computeDistributionPercentiles({
	xAxis,
	totals,
	percentiles,
}: {
	xAxis: DistributionXAxis;
	/** Summed visible counts per bucket. */
	totals: number[];
	percentiles: readonly number[];
}): DistributionPercentile[] {
	const { rows, edges } = xAxis;
	const total = totals.reduce((sum, count) => sum + count, 0);
	if (total <= 0 || rows.length === 0) {
		return [];
	}

	return percentiles.flatMap<DistributionPercentile>((percentile) => {
		const rank = (percentile / 100) * total;
		let below = 0;
		for (let index = 0; index < rows.length; index += 1) {
			const count = totals[index] ?? 0;
			if (count > 0 && below + count >= rank) {
				const row = rows[index];
				if (row.isOverflow) {
					return [
						{
							percentile,
							value: row.lower,
							axisValue: edges[index],
							isOverflow: true,
						},
					];
				}
				const fraction = (rank - below) / count;
				const lower = row.isUnderflow ? Math.min(0, row.upper) : row.lower;
				return [
					{
						percentile,
						value: lower + fraction * (row.upper - lower),
						axisValue: edges[index] + fraction * (edges[index + 1] - edges[index]),
						isOverflow: false,
					},
				];
			}
			below += count;
		}
		return [];
	});
}

export function formatPercentileName(percentile: number): string {
	return `p${Number(percentile.toFixed(3))}`;
}

/**
 * Markers that fall on the same spot, sharing one badge: the percentiles landing
 * in overflow all sit on its edge. Each group is in ascending percentile order.
 */
export function groupPercentileMarkers(
	markers: DistributionPercentile[],
): DistributionPercentile[][] {
	const groups = new Map<number, DistributionPercentile[]>();
	markers.forEach((marker) => {
		groups.set(marker.axisValue, [
			...(groups.get(marker.axisValue) ?? []),
			marker,
		]);
	});
	return [...groups.values()].map((group) =>
		[...group].sort((a, b) => a.percentile - b.percentile),
	);
}

/** `p90` for one marker; `p90+` for a group, starting at its lowest percentile. */
export function formatPercentileBadge(group: DistributionPercentile[]): string {
	const name = formatPercentileName(group[0].percentile);
	return group.length > 1 ? `${name}+` : name;
}

/**
 * `p99 ≈ 412 ms` for an estimate; `p90, p99 > 5 s` where only the overflow bound is
 * known. A group shares one spot, so one value and overflow flag.
 */
export function formatPercentileValue(
	group: DistributionPercentile[],
	formatBound: (value: number) => string,
): string {
	const names = group
		.map(({ percentile }) => formatPercentileName(percentile))
		.join(', ');
	const [{ value, isOverflow }] = group;
	return `${names} ${isOverflow ? '>' : '≈'} ${formatBound(value)}`;
}
