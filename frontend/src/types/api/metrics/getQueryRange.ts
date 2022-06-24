import { QueryData } from '../widgets/getQuery';

export type MetricsRangeProps = any;
export interface MetricRangePayloadProps {
	data: {
		result: QueryData[];
		resultType: string;
	};
}
