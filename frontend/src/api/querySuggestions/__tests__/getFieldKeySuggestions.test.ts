import { getAIObservabilityFieldsKeys } from 'api/generated/services/ai-observability';
import { getFieldsKeys } from 'api/generated/services/fields';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import { getFieldKeySuggestions } from '../getFieldKeySuggestions';
import { FieldKeysResponse } from '../types';

jest.mock('api/generated/services/ai-observability', () => ({
	getAIObservabilityFieldsKeys: jest.fn(),
}));

jest.mock('api/generated/services/fields', () => ({
	getFieldsKeys: jest.fn(),
}));

const mockedAIKeys = getAIObservabilityFieldsKeys as jest.MockedFunction<
	typeof getAIObservabilityFieldsKeys
>;
const mockedGenericKeys = getFieldsKeys as jest.MockedFunction<
	typeof getFieldsKeys
>;

const keysResponse = (): FieldKeysResponse => ({
	status: 'success',
	data: {
		complete: true,
		keys: { llm_call_count: [{ name: 'llm_call_count' }] },
	},
});

describe('getFieldKeySuggestions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('reads the ai_observability endpoint for a builder_ai_query', async () => {
		const response = keysResponse();
		mockedAIKeys.mockResolvedValue(response);

		const filterConfig = { searchText: 'llm' };
		const { signal } = new AbortController();

		await expect(
			getFieldKeySuggestions(filterConfig, 'builder_ai_query', signal),
		).resolves.toBe(response);
		expect(mockedAIKeys).toHaveBeenCalledWith(filterConfig, signal);
		expect(mockedGenericKeys).not.toHaveBeenCalled();
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
		const response = keysResponse();
		mockedGenericKeys.mockResolvedValue(response);

		const filterConfig = {
			signal: TelemetrytypesSignalDTO.traces,
			searchText: 'svc',
		};
		const { signal } = new AbortController();

		await expect(
			getFieldKeySuggestions(filterConfig, builderQueryType, signal),
		).resolves.toBe(response);
		expect(mockedGenericKeys).toHaveBeenCalledWith(filterConfig, signal);
		expect(mockedAIKeys).not.toHaveBeenCalled();
	});
});
