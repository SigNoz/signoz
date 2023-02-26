import { pipelineMockData } from 'container/PipelinePage/mocks/pipeline';
import {
	PipelineColumn,
	PipelineOperators,
} from 'container/PipelinePage/PipelineListsView';
import {
	PipelineActions,
	SAVE_PIPELINE_DATA,
	SAVE_PROCESSOR_DATA,
} from 'types/actions/pipeline';

export interface PipelineReducerType {
	pipelineData: Array<PipelineColumn>;
	processorData: Array<PipelineOperators>;
}

const initialState = {
	pipelineData: pipelineMockData,
	processorData: [],
};

export const PipelineReducer = (
	state = initialState,
	action: PipelineActions,
): PipelineReducerType => {
	switch (action.type) {
		case SAVE_PIPELINE_DATA:
			return {
				...state,
				pipelineData: action.payload,
			};

		case SAVE_PROCESSOR_DATA:
			return {
				...state,
				processorData: action.payload,
			};

		default:
			return state;
	}
};
