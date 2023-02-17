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

describe('Pipeline Page', () => {
	test('Total Input Field count should be 3', () => {
		expect(addPipelinefieldLists.length).toBe(3);
		expect(addPipelinefieldLists.length).toBeGreaterThan(1);
	});

	test('Processor Types length should be more than 1', () => {
		expect(processorTypes.length).toBeGreaterThan(1);
	});

	test('Processor InputField count should be 2', () => {
		expect(processorInputField.length).toBe(2);
		expect(processorInputField.length).toBeGreaterThan(1);
	});

	test('pipeline page Data should not be less than 0', () => {
		expect(pipelineData.length).toBe(2);
		expect(pipelineData.length).toBeGreaterThan(0);
	});

	test('pipeline and processor data delete', () => {
		const filterData = getElementFromArray(
			pipelineData,
			pipelineData[0],
			'id' as never,
		);
		expect(pipelineData).not.toEqual(filterData);
		expect(pipelineData[0]).not.toEqual(filterData);
		expect('id' as never).not.toEqual(filterData);
	});

	test('pipeline and processor data index', () => {
		const IndexData = getRecordIndex(pipelineData, pipelineData[0], '' as never);
		expect(pipelineData).not.toEqual(IndexData);
		expect(pipelineData[0]).not.toEqual(IndexData);
		expect('' as never).not.toEqual(IndexData);
	});

	test('pipeline and processor update record', () => {
		const updateData = getUpdatedRow(pipelineData, 1, 1);
		expect(pipelineData).toEqual(updateData);
	});
});
