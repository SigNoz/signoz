import { pipelineMockData } from 'container/PipelinePage/mocks/pipeline';
import {
	PipelineColumn,
	ProcessorColumn,
} from 'container/PipelinePage/PipelineListsView';
import {
	DELETE_PIPELINE_DATA,
	DELETE_PROCESSOR_DATA,
	NEW_ADD_PIPELINE_DATA,
	NEW_ADD_PROCESSOR_DATA,
	Pipeline,
	PIPELINE_DATA_ADD,
	PROCESSOR_DATA_ADD,
	UPDATE_PIPELINE_DATA,
	UPDATE_PROCESSOR_DATA,
} from 'types/actions/pipeline';

export interface PiplineReducerType {
	pipelineData: Array<PipelineColumn>;
	processorData: Array<ProcessorColumn>;
}

const initialState = {
	pipelineData: pipelineMockData,
	processorData: [],
};

export const PipelineReducer = (
	state = initialState,
	action: Pipeline,
): PiplineReducerType => {
	switch (action.type) {
		case NEW_ADD_PIPELINE_DATA: {
			const NewPiplineData = [...state.pipelineData, action.payload];
			return {
				...state,
				pipelineData: NewPiplineData,
			};
		}

		case PIPELINE_DATA_ADD:
		case UPDATE_PIPELINE_DATA:
		case DELETE_PIPELINE_DATA:
			return {
				...state,
				pipelineData: action.payload,
			};

		case NEW_ADD_PROCESSOR_DATA: {
			const NewProcessorData = [...state.processorData, action.payload];
			return {
				...state,
				processorData: NewProcessorData,
			};
		}

		case PROCESSOR_DATA_ADD:
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
