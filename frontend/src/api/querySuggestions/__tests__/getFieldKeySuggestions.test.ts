import { getAIObservabilityFieldsKeys } from 'api/generated/services/ai-observability';
import { getFieldsKeys } from 'api/generated/services/fields';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';

import { getFieldKeySuggestions } from '../getFieldKeySuggestions';
import { FieldKeysResponse } from '../types';
import type { MockedFunction } from 'vitest';

vi.mock('api/generated/services/ai-observability', () => ({
	getAIObservabilityFieldsKeys: vi.fn(),
}));

vi.mock('api/generated/services/fields', () => ({
	getFieldsKeys: vi.fn(),
}));

const mockedAIKeys = getAIObservabilityFieldsKeys as MockedFunction<
	typeof getAIObservabilityFieldsKeys
>;
const mockedGenericKeys = getFieldsKeys as MockedFunction<typeof getFieldsKeys>;

const keysResponse = (): FieldKeysResponse => ({
	status: 'success',
	data: {
		complete: true,
		keys: { llm_call_count: [{ name: 'llm_call_count' }] },
	},
});

describe('getFieldKeySuggestions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the ai_observability endpoint for a builder_ai_query', async () => {
		const response = keysResponse();
		mockedAIKeys.mockResolvedValue(response);

		const fieldKeysConfig = { searchText: 'llm' };
		const abortSignal = new AbortController().signal;

		await expect(
			getFieldKeySuggestions(fieldKeysConfig, 'builder_ai_query', abortSignal),
		).resolves.toBe(response);
		expect(mockedAIKeys).toHaveBeenCalledWith(fieldKeysConfig, abortSignal);
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

		const fieldKeysConfig = {
			signal: TelemetrytypesSignalDTO.traces,
			searchText: 'svc',
		};
		const abortSignal = new AbortController().signal;

		await expect(
			getFieldKeySuggestions(fieldKeysConfig, builderQueryType, abortSignal),
		).resolves.toBe(response);
		expect(mockedGenericKeys).toHaveBeenCalledWith(fieldKeysConfig, abortSignal);
		expect(mockedAIKeys).not.toHaveBeenCalled();
	});
});
