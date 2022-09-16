import { QueryData } from '../widgets/getQuery';

export type MetricsRangeProps = never;
export interface MetricRangePayloadProps {
	data: {
		result: QueryData[];
		resultType: string;
		variables: Record<string, unknown>;
	};
}
