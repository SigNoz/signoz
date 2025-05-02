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

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

describe('Utils testing of Pipeline Page', () => {
	test('it should be check form field of add pipeline', () => {
		expect(pipelineFields.length).toBe(3);
		expect(pipelineFields.length).toBeGreaterThan(1);
	});

	test('it should be check processor types field of add pipeline', () => {
		expect(processorTypes.length).toBeGreaterThan(1);
	});

	test('it should check form field of add processor', () => {
		Object.keys(processorFields).forEach((key) => {
			expect(processorFields[key].length).toBeGreaterThan(1);
		});
	});

	test('it should be check data length of pipeline', () => {
		expect(pipelineMockData.length).toBe(2);
		expect(pipelineMockData.length).toBeGreaterThan(0);
	});

	test('it should be return filtered data and perform deletion', () => {
		const filterData = getElementFromArray(
			pipelineMockData,
			pipelineMockData[0],
			'id',
		);
		expect(pipelineMockData).not.toEqual(filterData);
		expect(pipelineMockData[0]).not.toEqual(filterData);
	});

	test('it should be return index data and perform deletion', () => {
		const findRecordIndex = getRecordIndex(
			pipelineMockData,
			pipelineMockData[0],
			'id',
		);
		expect(pipelineMockData).not.toEqual(findRecordIndex);
		expect(pipelineMockData[0]).not.toEqual(findRecordIndex);
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
		expect(pipelineMockData).not.toEqual(editedData);
		expect(pipelineMockData.length).toEqual(editedData.length);
		expect(pipelineMockData[0].name).not.toEqual(editedData[0].name);
		expect(pipelineMockData[0].description).not.toEqual(
			editedData[0].description,
		);
		expect(pipelineMockData[0].tags).not.toEqual(editedData[0].tags);
	});
});
