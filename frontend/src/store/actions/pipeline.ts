import {
	PipelineColumn,
	PipelineOperators,
} from 'container/PipelinePage/PipelineListsView';
import { Dispatch } from 'react';
import AppActions from 'types/actions';
import {
	SAVE_PIPELINE_DATA,
	SAVE_PROCESSOR_DATA,
} from 'types/actions/pipeline';

export const SavePipelineData = (
	newAddPipelineData: Array<PipelineColumn>,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: SAVE_PIPELINE_DATA,
		payload: newAddPipelineData,
	});
};

export const SaveProcessorData = (
	newAddPipelineData: Array<PipelineOperators>,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: SAVE_PROCESSOR_DATA,
		payload: newAddPipelineData,
	});
};
