import { MetrictypesSpaceAggregationDTO } from 'api/generated/services/sigNoz.schemas';
import { WidgetKeys } from '../constant';
import { LatencyAtOrBelowAggregation } from '../Tabs/types';
import { getNearestHighestBucketValue } from '../utils';

// the comparison count stops at the largest finite bucket, so a threshold past it
// reads the count metric, which is the +Inf bucket
export const getLatencyAtOrBelowAggregation = (
	thresholdMs: number,
	buckets: number[],
): LatencyAtOrBelowAggregation => {
	const bucket = getNearestHighestBucketValue(thresholdMs, buckets);
	return bucket === undefined
		? {
				key: WidgetKeys.SignozLatencyCount,
				spaceAggregation: MetrictypesSpaceAggregationDTO.sum,
			}
		: {
				key: WidgetKeys.SignozLatencyBucket,
				spaceAggregation: MetrictypesSpaceAggregationDTO.count,
				param: { operator: '<=', threshold: bucket },
			};
};
