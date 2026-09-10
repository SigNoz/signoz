import { getAIObservabilityFieldsValues } from 'api/generated/services/ai-observability';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { DataSource } from 'types/common/queryBuilder';

import { fetchFieldValuesForQuery } from '../fieldSuggestions';

jest.mock('api/generated/services/ai-observability', () => ({
	getAIObservabilityFieldsValues: jest.fn(),
}));

jest.mock('api/querySuggestions/getValueSuggestion', () => ({
	getValueSuggestions: jest.fn(),
}));

const mockedAIValues = getAIObservabilityFieldsValues as jest.MockedFunction<
	typeof getAIObservabilityFieldsValues
>;
const mockedGenericValues = getValueSuggestions as jest.MockedFunction<
	typeof getValueSuggestions
>;

const aiValuesResponse = (
	values: { stringValues?: string[]; numberValues?: number[] } | null,
	complete = true,
): Awaited<ReturnType<typeof getAIObservabilityFieldsValues>> =>
	({
		status: 'success',
		data: { complete, values },
	}) as Awaited<ReturnType<typeof getAIObservabilityFieldsValues>>;

describe('fetchFieldValuesForQuery', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('reads the ai_observability endpoint for a builder_ai_query', async () => {
		mockedAIValues.mockResolvedValue(
			aiValuesResponse({ stringValues: ['gpt-4o'], numberValues: [] }),
		);

		const response = await fetchFieldValuesForQuery({
			builderQueryType: 'builder_ai_query',
			dataSource: DataSource.TRACES,
			key: 'gen_ai.request.model',
			searchText: 'gpt',
		});

		expect(mockedGenericValues).not.toHaveBeenCalled();
		expect(response).toStrictEqual({
			data: {
				data: {
					complete: true,
					values: { stringValues: ['gpt-4o'], numberValues: [] },
				},
			},
		});
	});

	it('forwards the key as the name the endpoint expects', async () => {
		mockedAIValues.mockResolvedValue(aiValuesResponse({}));

		await fetchFieldValuesForQuery({
			builderQueryType: 'builder_ai_query',
			dataSource: DataSource.TRACES,
			key: 'total_tokens',
			searchText: '',
		});

		expect(mockedAIValues).toHaveBeenCalledWith({
			name: 'total_tokens',
			searchText: '',
		});
	});

	it('wraps the ai_observability payload in the envelope the call site unwraps', async () => {
		mockedAIValues.mockResolvedValue(aiValuesResponse(null, false));

		await expect(
			fetchFieldValuesForQuery({
				builderQueryType: 'builder_ai_query',
				dataSource: DataSource.TRACES,
				key: 'llm_call_count',
				searchText: '',
			}),
		).resolves.toStrictEqual({
			data: { data: { complete: false, values: null } },
		});
	});

	it.each<[string, 'builder_query' | undefined]>([
		['an unmarked query', undefined],
		['an explicitly generic query', 'builder_query'],
	])('reads the generic endpoint for %s', async (_label, builderQueryType) => {
		const genericResponse = {
			data: {
				data: { complete: false, values: { stringValues: ['frontend'] } },
			},
		} as unknown as Awaited<ReturnType<typeof getValueSuggestions>>;
		mockedGenericValues.mockResolvedValue(genericResponse);

		const response = await fetchFieldValuesForQuery({
			builderQueryType,
			dataSource: DataSource.TRACES,
			key: 'service.name',
			searchText: 'front',
		});

		expect(mockedAIValues).not.toHaveBeenCalled();
		expect(mockedGenericValues).toHaveBeenCalledWith(
			expect.objectContaining({
				signal: DataSource.TRACES,
				key: 'service.name',
				searchText: 'front',
			}),
		);
		expect(response).toBe(genericResponse);
	});
});
