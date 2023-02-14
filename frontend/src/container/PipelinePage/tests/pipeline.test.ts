import { pipelineData } from '../ListOfPipelines';
import { inputfieldName } from '../Pipeline/utils';
import { processorInputField, processorTypes } from '../Processor/utils';

describe('Pipeline Page', () => {
	test('Total Input Field count should be 3', () => {
		expect(inputfieldName.length).toBe(3);
		expect(inputfieldName.length).toBeGreaterThan(1);
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
});
