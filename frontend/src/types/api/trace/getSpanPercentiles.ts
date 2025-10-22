export interface GetSpanPercentilesProps {
	start: number;
	end: number;
	span_duration: number;
	service_name: string;
	name: string;
	resource_attributes: Record<string, string>;
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
