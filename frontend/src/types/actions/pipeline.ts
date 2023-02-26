import {
	PipelineColumn,
	PipelineOperators,
} from 'container/PipelinePage/PipelineListsView';

export const SAVE_PIPELINE_DATA = 'SAVE_PIPELINE_DATA';
export const SAVE_PROCESSOR_DATA = 'SAVE_PROCESSOR_DATA';

interface SavePipelineData {
	type: typeof SAVE_PIPELINE_DATA;
	payload: Array<PipelineColumn>;
}

interface SaveProcessorData {
	type: typeof SAVE_PROCESSOR_DATA;
	payload: Array<PipelineOperators>;
}

export type PipelineActions = SavePipelineData | SaveProcessorData;
