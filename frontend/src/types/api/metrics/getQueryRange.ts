import { QueryData, QueryDataV3 } from '../widgets/getQuery';

export type MetricsRangeProps = never;
export interface MetricRangePayloadProps {
	data: {
		result: QueryData[];
		resultType: string;
		newResult: MetricRangePayloadV3;
	};
}

export interface MetricRangePayloadV3 {
	data: {
		result: QueryDataV3[];
		resultType: string;
	};
}
