import { mockPipelineFilter, pipelineMockData } from '../mocks/pipeline';
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
} from '../PipelineListsView/utils';

describe('Utils testing of Pipeline Page', () => {
	it('should be check form field of add pipeline', () => {
		expect(pipelineFields).toHaveLength(3);
		expect(pipelineFields.length).toBeGreaterThan(1);
	});

	it('should be check processor types field of add pipeline', () => {
		expect(processorTypes.length).toBeGreaterThan(1);
	});

	it('should check form field of add processor', () => {
		Object.keys(processorFields).forEach((key) => {
			expect(processorFields[key].length).toBeGreaterThan(1);
		});
	});

	it('should be check data length of pipeline', () => {
		expect(pipelineMockData).toHaveLength(2);
		expect(pipelineMockData.length).toBeGreaterThan(0);
	});

	it('should be return filtered data and perform deletion', () => {
		const filterData = getElementFromArray(
			pipelineMockData,
			pipelineMockData[0],
			'id',
		);
		expect(pipelineMockData).not.toStrictEqual(filterData);
		expect(pipelineMockData[0]).not.toStrictEqual(filterData);
	});

	it('should be return index data and perform deletion', () => {
		const findRecordIndex = getRecordIndex(
			pipelineMockData,
			pipelineMockData[0],
			'id',
		);
		expect(pipelineMockData).not.toStrictEqual(findRecordIndex);
		expect(pipelineMockData[0]).not.toStrictEqual(findRecordIndex);
	});

	it('should be return modified column data', () => {
		const columnData = getTableColumn(processorColumns);
		expect(processorColumns).not.toStrictEqual(columnData);
		expect(processorColumns).toHaveLength(columnData.length);
	});

	it('should be return modified column data', () => {
		const findRecordIndex = getRecordIndex(
			pipelineMockData,
			pipelineMockData[0],
			'name',
		);
		const updatedPipelineData = {
			...pipelineMockData[findRecordIndex],
			name: 'updated name',
			description: 'changed description',
			filter: mockPipelineFilter('value', '=', 'test'),
			tags: ['test'],
		};
		const editedData = getEditedDataSource(
			pipelineMockData,
			pipelineMockData[0],
			'name',
			updatedPipelineData,
		);
		expect(pipelineMockData).not.toStrictEqual(editedData);
		expect(pipelineMockData).toHaveLength(editedData.length);
		expect(pipelineMockData[0].name).not.toStrictEqual(editedData[0].name);
		expect(pipelineMockData[0].description).not.toStrictEqual(
			editedData[0].description,
		);
		expect(pipelineMockData[0].tags).not.toStrictEqual(editedData[0].tags);
	});
});
