import { getAIObservabilityFieldsValues } from 'api/generated/services/ai-observability';
import { getFieldsValues } from 'api/generated/services/fields';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import { getFieldValueSuggestions } from '../getFieldValueSuggestions';
import { FieldValuesResponse } from '../types';
import type { MockedFunction } from 'vitest';

vi.mock('api/generated/services/ai-observability', () => ({
	getAIObservabilityFieldsValues: vi.fn(),
}));

vi.mock('api/generated/services/fields', () => ({
	getFieldsValues: vi.fn(),
}));

const mockedAIValues = getAIObservabilityFieldsValues as MockedFunction<
	typeof getAIObservabilityFieldsValues
>;
const mockedGenericValues = getFieldsValues as MockedFunction<
	typeof getFieldsValues
>;

const valuesResponse = (): FieldValuesResponse => ({
	status: 'success',
	data: { complete: true, values: { stringValues: ['gpt-4o'] } },
});

describe('getFieldValueSuggestions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the ai_observability endpoint for a builder_ai_query, forwarding the key as name', async () => {
		const response = valuesResponse();
		mockedAIValues.mockResolvedValue(response);

		const fieldValuesConfig = { name: 'gen_ai.request.model', searchText: 'gpt' };
		const abortSignal = new AbortController().signal;

		await expect(
			getFieldValueSuggestions(fieldValuesConfig, 'builder_ai_query', abortSignal),
		).resolves.toBe(response);
		expect(mockedAIValues).toHaveBeenCalledWith(fieldValuesConfig, abortSignal);
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

		const fieldValuesConfig = {
			signal: TelemetrytypesSignalDTO.traces,
			name: 'service.name',
			searchText: 'front',
		};
		const abortSignal = new AbortController().signal;

		await expect(
			getFieldValueSuggestions(fieldValuesConfig, builderQueryType, abortSignal),
		).resolves.toBe(response);
		expect(mockedGenericValues).toHaveBeenCalledWith(
			fieldValuesConfig,
			abortSignal,
		);
		expect(mockedAIValues).not.toHaveBeenCalled();
	});
});
