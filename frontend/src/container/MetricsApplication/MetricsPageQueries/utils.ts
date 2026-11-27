import { WidgetKeys } from '../constant';
import { LatencyCountAtOrBelow } from '../Tabs/types';
import { getNearestHighestBucketValue } from '../utils';

// the comparison count stops at the largest finite bucket, so a threshold past it
// reads the count metric, which is the +Inf bucket
export const getLatencyCountAtOrBelow = (
	ms: number,
	buckets: number[],
): LatencyCountAtOrBelow => {
	const bucket = getNearestHighestBucketValue(ms, buckets);
	return bucket === undefined
		? {
				key: WidgetKeys.SignozLatencyCount,
				spaceAggregation: 'sum',
			}
		: {
				key: WidgetKeys.SignozLatencyBucket,
				spaceAggregation: 'count',
				param: { operator: '<=', threshold: bucket },
			};
};
