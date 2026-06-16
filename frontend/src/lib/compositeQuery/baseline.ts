import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { LOGS_BASELINE_V1 } from 'lib/compositeQuery/baseline.logs';
import { TRACES_BASELINE_V1 } from 'lib/compositeQuery/baseline.traces';
import { METRICS_BASELINE_V1 } from 'lib/compositeQuery/baseline.metrics';

/**
 * Baseline tag indicators for URL encoding.
 */
export type BaselineTag = 'm' | 'l' | 't';

/**
 * Pick optimal baseline based on query's primary dataSource.
 */
export function pickBaseline(query: Query): {
	baseline: Query;
	tag: BaselineTag;
} {
	const ds = query.builder?.queryData?.[0]?.dataSource;
	if (ds === 'logs') {
		return { baseline: LOGS_BASELINE_V1, tag: 'l' };
	}
	if (ds === 'traces') {
		return { baseline: TRACES_BASELINE_V1, tag: 't' };
	}
	return { baseline: METRICS_BASELINE_V1, tag: 'm' };
}

function getBaselineByTag(tag: BaselineTag): Query {
	if (tag === 'l') {
		return LOGS_BASELINE_V1;
	}
	if (tag === 't') {
		return TRACES_BASELINE_V1;
	}
	return METRICS_BASELINE_V1;
}

export default getBaselineByTag;
