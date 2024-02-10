import { TagFilter } from '../queryBuilder/queryBuilderData';

export interface ProcessorData {
	type: string;
	id?: string;
	orderId: number;
	name: string;
	enabled?: boolean;
	output?: string;
	parse_to?: string;
	pattern?: string;
	parse_from?: string;
	from?: string;
	to?: string;
	regex?: string;
	on_error?: string;
	field?: string;
	value?: string;

	// trace parser fields.
	trace_id?: {
		parse_from: string;
	};
	span_id?: {
		parse_from: string;
	};
	trace_flags?: {
		parse_from: string;
	};

	// time parser fields
	layout_type?: string;
	layout?: string;
}

export interface PipelineData {
	alias: string;
	config?: Array<ProcessorData>;
	createdAt: string;
	description?: string;
	createdBy: string;
	enabled: boolean;
	filter: TagFilter;
	id?: string;
	name: string;
	orderId: number;
	tags?: Array<string>; // Tags data is missing in API response
}

export interface HistoryData {
	active: boolean;
	createdAt: string;
	createdBy: string;
	createdByName: string;
	deployStatus: string;
	deployResult: string;
	disabled: boolean;
	elementType: string;
	id: string;
	isValid: boolean;
	lastConf: string;
	lastHash: string;
	version: number;
}

export interface Pipeline {
	active: boolean;
	createdBy: string;
	deployResult: string;
	deployStatus: string;
	disabled: boolean;
	elementType: string;
	history: Array<HistoryData>;
	id: string;
	is_valid: boolean;
	lastConf: string;
	lastHash: string;
	pipelines: Array<PipelineData>;
	version: string | number;
}

export enum ActionType {
	AddPipeline = 'add-pipeline',
	EditPipeline = 'edit-pipeline',
	AddProcessor = 'add-processor',
	EditProcessor = 'edit-processor',
}

export enum ActionMode {
	Viewing = 'viewing-mode',
	Editing = 'editing-mode',
	Deploying = 'deploying-mode',
}
