export interface ProcessorData {
	type: string;
	id: string;
	name: string;
	output?: string;
	parse_to?: string;
	pattern?: string;
	parse_from?: string;
	from?: string;
	to?: string;
}

export interface PipelineData {
	alias: string;
	config?: Array<ProcessorData>;
	createdAt: string;
	createdBy: string;
	enabled: boolean;
	filter: string;
	id?: string;
	name: string;
	orderId: string;
	tags?: Array<string>; // Tags data is missing in API response
}

export interface PipelineResponse {
	active: boolean;
	createdBy: string;
	deployResult: string;
	deployStatus: string;
	disabled: boolean;
	elementType: string;
	id: string;
	is_valid: boolean;
	lastConf: string;
	lastHash: string;
	pipelines: Array<PipelineData>;
	version: string | number;
}
