export type MetricsRangeProps = any;
export interface MetricRangePayloadProps {
	data: {
		result: {
			queryName: string;
			metric: Record<string, string>;
			values: [number, string][];
			legend?: string;
		}[];
		resultType: string;
	};
}
