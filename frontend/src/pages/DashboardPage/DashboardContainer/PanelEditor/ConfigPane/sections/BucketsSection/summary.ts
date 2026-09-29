import type { DashboardtypesHistogramBucketsDTO } from 'api/generated/services/sigNoz.schemas';

import { joinSummary } from '../../utils/summary';

export function summarizeBuckets(
	value: DashboardtypesHistogramBucketsDTO | undefined,
): string {
	const custom =
		typeof value?.bucketCount === 'number' ||
		typeof value?.bucketWidth === 'number';
	return joinSummary([
		custom ? 'Custom' : 'Auto',
		value?.mergeAllActiveQueries && 'combined',
	]);
}
