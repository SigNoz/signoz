import { pipelineMockData } from '../mocks/pipeline';
import {
	processorFields,
	processorTypes,
} from '../PipelineListsView/AddNewProcessor/config';
import { pipelineFields, processorColumns } from '../PipelineListsView/config';
import {
	getEditedDataSource,
	getElementFromArray,
	getRecordIndex,
	getTableColumn,
	getUpdatedRow,
} from '../PipelineListsView/utils';

describe('Utils testing of Pipeline Page', () => {
	test('it should be check form field of add pipeline', () => {
		expect(pipelineFields.length).toBe(4);
		expect(pipelineFields.length).toBeGreaterThan(1);
	});

	test('it should be check processor types field of add pipeline', () => {
		expect(processorTypes.length).toBeGreaterThan(1);
	});

	test('it should be check form field of add processor', () => {
		expect(processorFields.length).toBe(2);
		expect(processorFields.length).toBeGreaterThan(1);
	});

	test('it should be check data length of pipeline', () => {
		expect(pipelineMockData.length).toBe(2);
		expect(pipelineMockData.length).toBeGreaterThan(0);
	});

	test('it should be return filtered data and perform deletion', () => {
		const filterData = getElementFromArray(
			pipelineMockData,
			pipelineMockData[0],
			'uuid',
		);
		expect(pipelineMockData).not.toEqual(filterData);
		expect(pipelineMockData[0]).not.toEqual(filterData);
	});

	test('it should be return index data and perform deletion', () => {
		const findRecordIndex = getRecordIndex(
			pipelineMockData,
			pipelineMockData[0],
			'uuid',
		);
		expect(pipelineMockData).not.toEqual(findRecordIndex);
		expect(pipelineMockData[0]).not.toEqual(findRecordIndex);
	});

	test('it should be return shuffle data', () => {
		const updateData = getUpdatedRow(pipelineMockData, 1, 1);
		expect(pipelineMockData).toEqual(updateData);
	});

	test('it should be return modified column data', () => {
		const columnData = getTableColumn(processorColumns);
		expect(processorColumns).not.toEqual(columnData);
		expect(processorColumns.length).toEqual(columnData.length);
	});

	test('it should be return modified column data', () => {
		const findRecordIndex = getRecordIndex(
			pipelineMockData,
			pipelineMockData[0],
			'name',
		);
		const updatedPipelineData = {
			...pipelineMockData[findRecordIndex],
			name: 'updated name',
			alias: 'changed alias',
			filter: 'value == test',
			tags: ['test'],
		};
		const editedData = getEditedDataSource(
			pipelineMockData,
			pipelineMockData[0],
			'name',
			updatedPipelineData,
		);
		expect(pipelineMockData).not.toEqual(editedData);
		expect(pipelineMockData.length).toEqual(editedData.length);
		expect(pipelineMockData[0].name).not.toEqual(editedData[0].name);
		expect(pipelineMockData[0].alias).not.toEqual(editedData[0].alias);
		expect(pipelineMockData[0].alias).not.toEqual(editedData[0].alias);
		expect(pipelineMockData[0].tags).not.toEqual(editedData[0].tags);
	});
});
