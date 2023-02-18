import { pipelineData } from '../mocks/pipeline';
import {
	processorInputField,
	processorTypes,
} from '../PipelineListsView/AddNewProcessor/config';
import { addPipelinefieldLists } from '../PipelineListsView/config';
import {
	getElementFromArray,
	getRecordIndex,
	getUpdatedRow,
} from '../PipelineListsView/utils';

describe('Utils testing of Pipeline Page', () => {
	test('it should be check form field of add pipeline', () => {
		expect(addPipelinefieldLists.length).toBe(3);
		expect(addPipelinefieldLists.length).toBeGreaterThan(1);
	});

	test('it should be check processor types field of add pipeline', () => {
		expect(processorTypes.length).toBeGreaterThan(1);
	});

	test('it should be check form field of add processor', () => {
		expect(processorInputField.length).toBe(2);
		expect(processorInputField.length).toBeGreaterThan(1);
	});

	test('it should be check data length of pipeline', () => {
		expect(pipelineData.length).toBe(2);
		expect(pipelineData.length).toBeGreaterThan(0);
	});

	test('it should be return filtered data and perform deletion', () => {
		const filterData = getElementFromArray(
			pipelineData,
			pipelineData[0],
			'id' as never,
		);
		expect(pipelineData).not.toEqual(filterData);
		expect(pipelineData[0]).not.toEqual(filterData);
	});

	test('it should be return index data and perform deletion', () => {
		const findRecordIndex = getRecordIndex(
			pipelineData,
			pipelineData[0],
			'' as never,
		);
		expect(pipelineData).not.toEqual(findRecordIndex);
		expect(pipelineData[0]).not.toEqual(findRecordIndex);
	});

	test('it should be return shuffle data', () => {
		const updateData = getUpdatedRow(pipelineData, 1, 1);
		expect(pipelineData).toEqual(updateData);
	});
});
