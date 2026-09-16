import { getAIObservabilityFieldsValues } from 'api/generated/services/ai-observability';
import { getFieldsValues } from 'api/generated/services/fields';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import { getFieldValueSuggestions } from '../getFieldValueSuggestions';
import { FieldValuesResponse } from '../types';

jest.mock('api/generated/services/ai-observability', () => ({
	getAIObservabilityFieldsValues: jest.fn(),
}));

jest.mock('api/generated/services/fields', () => ({
	getFieldsValues: jest.fn(),
}));

const mockedAIValues = getAIObservabilityFieldsValues as jest.MockedFunction<
	typeof getAIObservabilityFieldsValues
>;
const mockedGenericValues = getFieldsValues as jest.MockedFunction<
	typeof getFieldsValues
>;

const valuesResponse = (): FieldValuesResponse => ({
	status: 'success',
	data: { complete: true, values: { stringValues: ['gpt-4o'] } },
});

describe('getFieldValueSuggestions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('reads the ai_observability endpoint for a builder_ai_query, forwarding the key as name', async () => {
		const response = valuesResponse();
		mockedAIValues.mockResolvedValue(response);

		const filterConfig = { name: 'gen_ai.request.model', searchText: 'gpt' };

		await expect(
			getFieldValueSuggestions(filterConfig, 'builder_ai_query'),
		).resolves.toBe(response);
		expect(mockedAIValues).toHaveBeenCalledWith(filterConfig);
		expect(mockedGenericValues).not.toHaveBeenCalled();
	});

	it.each<
		[
			'an unmarked query' | 'an explicitly generic query',
			undefined | 'builder_query',
		]
	>([
		['an unmarked query', undefined],
		['an explicitly generic query', 'builder_query'],
	])('reads the generic endpoint for %s', async (_label, builderQueryType) => {
		const response = valuesResponse();
		mockedGenericValues.mockResolvedValue(response);

		const filterConfig = {
			signal: TelemetrytypesSignalDTO.traces,
			name: 'service.name',
			searchText: 'front',
		};

		await expect(
			getFieldValueSuggestions(filterConfig, builderQueryType),
		).resolves.toBe(response);
		expect(mockedGenericValues).toHaveBeenCalledWith(filterConfig);
		expect(mockedAIValues).not.toHaveBeenCalled();
	});
});
