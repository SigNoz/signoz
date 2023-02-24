import {
	PipelineColumn,
	ProcessorColumn,
} from 'container/PipelinePage/PipelineListsView';

export const NAME = 'NAME';
export const PIPELINE_DATA_ADD = 'PIPELINE_DATA_ADD';
export const NEW_ADD_PIPELINE_DATA = 'NEW_ADD_PIPELINE_DATA';
export const UPDATE_PIPELINE_DATA = 'UPDATE_PIPELINE_DATA';
export const DELETE_PIPELINE_DATA = 'DELETE_PIPELINE_DATA';
export const PROCESSOR_DATA_ADD = 'PROCESSOR_DATA_ADD';
export const NEW_ADD_PROCESSOR_DATA = 'NEW_ADD_PROCESSOR_DATA';
export const UPDATE_PROCESSOR_DATA = 'UPDATE_PROCESSOR_DATA';
export const DELETE_PROCESSOR_DATA = 'DELETE_PROCESSOR_DATA';

interface AddDataPipline {
	type: typeof PIPELINE_DATA_ADD;
	payload: Array<PipelineColumn>;
}

interface NewAddPiplineData {
	type: typeof NEW_ADD_PIPELINE_DATA;
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

interface ProcessorDataAdd {
	type: typeof PROCESSOR_DATA_ADD;
	payload: Array<ProcessorColumn>;
}

interface NewAddProcessorData {
	type: typeof NEW_ADD_PROCESSOR_DATA;
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

export type Pipeline =
	| AddDataPipline
	| NewAddPiplineData
	| UpdatePipelineData
	| DeletePipelineData
	| ProcessorDataAdd
	| NewAddProcessorData
	| UpdateProcessorData
	| DeleteProcessorData;
