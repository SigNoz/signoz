import { pipelineMockData } from 'container/PipelinePage/mocks/pipeline';
import {
	PipelineColumn,
	ProcessorColumn,
} from 'container/PipelinePage/PipelineListsView';
import {
	ADD_PIPELINE_DATA,
	ADD_PROCESSOR_DATA,
	DELETE_PIPELINE_DATA,
	DELETE_PROCESSOR_DATA,
	PipelineActions,
	UPDATE_PIPELINE_DATA,
	UPDATE_PROCESSOR_DATA,
} from 'types/actions/pipeline';

export interface PipelineReducerType {
	pipelineData: Array<PipelineColumn>;
	processorData: Array<ProcessorColumn>;
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
		case ADD_PIPELINE_DATA: {
			return {
				...state,
				pipelineData: [...state.pipelineData, action.payload],
			};
		}

		case UPDATE_PIPELINE_DATA:
		case DELETE_PIPELINE_DATA:
			return {
				...state,
				pipelineData: action.payload,
			};

		case ADD_PROCESSOR_DATA: {
			return {
				...state,
				processorData: [...state.processorData, action.payload],
			};
		}

		case UPDATE_PROCESSOR_DATA:
		case DELETE_PROCESSOR_DATA:
			return {
				...state,
				processorData: action.payload,
			};

		default:
			return state;
	}
};
