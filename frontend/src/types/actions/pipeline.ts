import {
	PipelineColumn,
	ProcessorColumn,
} from 'container/PipelinePage/PipelineListsView';

export const ADD_PIPELINE_DATA = 'ADD_PIPELINE_DATA';
export const UPDATE_PIPELINE_DATA = 'UPDATE_PIPELINE_DATA';
export const DELETE_PIPELINE_DATA = 'DELETE_PIPELINE_DATA';
export const ADD_PROCESSOR_DATA = 'ADD_PROCESSOR_DATA';
export const UPDATE_PROCESSOR_DATA = 'UPDATE_PROCESSOR_DATA';
export const DELETE_PROCESSOR_DATA = 'DELETE_PROCESSOR_DATA';

interface AddPipelineData {
	type: typeof ADD_PIPELINE_DATA;
	payload: PipelineColumn;
}

interface UpdatePipelineData {
	type: typeof UPDATE_PIPELINE_DATA;
	payload: Array<PipelineColumn>;
}

interface DeletePipelineData {
	type: typeof DELETE_PIPELINE_DATA;
	payload: Array<PipelineColumn>;
}

interface AddProcessorData {
	type: typeof ADD_PROCESSOR_DATA;
	payload: ProcessorColumn;
}

interface UpdateProcessorData {
	type: typeof UPDATE_PROCESSOR_DATA;
	payload: Array<ProcessorColumn>;
}

interface DeleteProcessorData {
	type: typeof DELETE_PROCESSOR_DATA;
	payload: Array<ProcessorColumn>;
}

export type PipelineActions =
	| AddPipelineData
	| UpdatePipelineData
	| DeletePipelineData
	| AddProcessorData
	| UpdateProcessorData
	| DeleteProcessorData;
