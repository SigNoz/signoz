import type { BuilderQuery } from 'types/api/v5/queryRange';

export interface QueryGroupBy {
	queryName: string;
	labels: string[];
}

function signature(labels: string[]): string {
	return [...labels].sort().join('\0');
}

/**
 * Each enabled builder query's group-by labels when they differ; null when they
 * all match. The join keys rows on every query's labels, so any difference
 * leaves no row with values from two queries.
 */
export function findGroupByMismatch(
	queries: BuilderQuery[],
): QueryGroupBy[] | null {
	const grouped = queries
		.filter((query) => !query.disabled)
		.map((query) => ({
			queryName: query.name ?? '',
			labels: (query.groupBy ?? []).map((key) => key.name),
		}));
	if (grouped.length < 2) {
		return null;
	}
	const first = signature(grouped[0].labels);
	return grouped.every((query) => signature(query.labels) === first)
		? null
		: grouped;
}

/** `A by service.name · B by host.name`. */
export function formatGroupByMismatch(mismatch: QueryGroupBy[]): string {
	return mismatch
		.map(({ queryName, labels }) =>
			labels.length > 0
				? `${queryName} by ${labels.join(', ')}`
				: `${queryName} ungrouped`,
		)
		.join(' · ');
}
