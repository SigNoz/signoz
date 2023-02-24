import {
	PipelineColumn,
	ProcessorColumn,
} from 'container/PipelinePage/PipelineListsView';
import {
	getEditedDataSource,
	getElementFromArray,
	getRecordIndex,
} from 'container/PipelinePage/PipelineListsView/utils';
import { Dispatch } from 'react';
import AppActions from 'types/actions';
import {
	DELETE_PIPELINE_DATA,
	DELETE_PROCESSOR_DATA,
	NEW_ADD_PIPELINE_DATA,
	NEW_ADD_PROCESSOR_DATA,
	PIPELINE_DATA_ADD,
	PROCESSOR_DATA_ADD,
	UPDATE_PIPELINE_DATA,
	UPDATE_PROCESSOR_DATA,
} from 'types/actions/pipeline';

export const AddDataPipline = (
	pipelineDataAdd: Array<PipelineColumn>,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: PIPELINE_DATA_ADD,
		payload: pipelineDataAdd,
	});
};

export const NewAddPiplineData = (
	newAddPiplineData: PipelineColumn,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: NEW_ADD_PIPELINE_DATA,
		payload: newAddPiplineData,
	});
};

export const UpdatePipelineData = (
	pipelineData: Array<PipelineColumn>,
	selectedRecord: PipelineColumn | undefined,
	values: PipelineColumn,
	tagsListData: string[] | undefined,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	const findRecordIndex = getRecordIndex(
		pipelineData,
		selectedRecord,
		'name' as never,
	);
	const updatedPipelineData = {
		...pipelineData[findRecordIndex],
		name: values.name,
		alias: values.alias,
		filter: values.filter,
		tags: tagsListData,
	};

	const editedPipelineData = getEditedDataSource(
		pipelineData,
		selectedRecord,
		'name' as never,
		updatedPipelineData,
	);

	dispatch({
		type: UPDATE_PIPELINE_DATA,
		payload: editedPipelineData as Array<PipelineColumn>,
	});
};

export const DeletePipelineData = (
	pipelineData: Array<PipelineColumn>,
	record: PipelineColumn,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	const findElement = getElementFromArray(pipelineData, record, 'orderid');

	dispatch({
		type: DELETE_PIPELINE_DATA,
		payload: findElement,
	});
};

export const ProcessorDataAdd = (
	processorData: Array<ProcessorColumn>,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: PROCESSOR_DATA_ADD,
		payload: processorData,
	});
};

export const NewAddProcessorData = (
	processorData: ProcessorColumn,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	dispatch({
		type: NEW_ADD_PROCESSOR_DATA,
		payload: processorData,
	});
};

export const UpdateProcessorData = (
	processorData: Array<ProcessorColumn>,
	selectedProcessorData: ProcessorColumn | undefined,
	values: ProcessorColumn,
	processorType: string,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	const findRecordIndex = getRecordIndex(
		processorData,
		selectedProcessorData,
		'processorName' as never,
	);

	const updatedProcessorData = {
		...processorData[findRecordIndex],
		type: processorType,
		processorName: values.processorName,
		description: values.description,
		name: values.processorName,
	};

	const editedProcessorData = getEditedDataSource(
		processorData,
		selectedProcessorData,
		'processorName' as never,
		updatedProcessorData,
	);

	dispatch({
		type: UPDATE_PROCESSOR_DATA,
		payload: editedProcessorData as Array<ProcessorColumn>,
	});
};

export const DeleteProcessorData = (
	processorData: Array<ProcessorColumn>,
	record: ProcessorColumn,
): ((dispatch: Dispatch<AppActions>) => void) => (
	dispatch: Dispatch<AppActions>,
): void => {
	const findElement = getElementFromArray(processorData, record, 'id');

	dispatch({
		type: DELETE_PROCESSOR_DATA,
		payload: findElement,
	});
};
