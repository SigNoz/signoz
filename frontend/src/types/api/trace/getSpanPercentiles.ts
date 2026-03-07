export interface GetSpanPercentilesProps {
	start: number;
	end: number;
	spanDuration: number;
	serviceName: string;
	name: string;
	resourceAttributes: Record<string, string>;
}

export interface GetSpanPercentilesResponseDataProps {
	percentiles: Record<string, number>;
	position: {
		percentile: number;
		description: string;
	};
}

export interface GetSpanPercentilesResponsePayloadProps {
	status: string;
	data: GetSpanPercentilesResponseDataProps;
}
