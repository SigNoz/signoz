import {
	getAIObservabilityFieldsKeys,
	getAIObservabilityFieldsValues,
} from 'api/generated/services/ai-observability';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { getValueSuggestions } from 'api/querySuggestions/getValueSuggestion';
import { DataSource } from 'types/common/queryBuilder';

import {
	fetchFieldKeysForQuery,
	fetchFieldValuesForQuery,
} from '../fieldSuggestions';

jest.mock('api/generated/services/ai-observability', () => ({
	getAIObservabilityFieldsKeys: jest.fn(),
	getAIObservabilityFieldsValues: jest.fn(),
}));

jest.mock('api/querySuggestions/getKeySuggestions', () => ({
	getKeySuggestions: jest.fn(),
}));

jest.mock('api/querySuggestions/getValueSuggestion', () => ({
	getValueSuggestions: jest.fn(),
}));

const mockedAIKeys = getAIObservabilityFieldsKeys as jest.MockedFunction<
	typeof getAIObservabilityFieldsKeys
>;
const mockedGenericKeys = getKeySuggestions as jest.MockedFunction<
	typeof getKeySuggestions
>;
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

describe('fetchFieldKeysForQuery', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('reads the ai_observability endpoint for a builder_ai_query', async () => {
		mockedAIKeys.mockResolvedValue({
			status: 'success',
			data: {
				complete: true,
				keys: { llm_call_count: [{ name: 'llm_call_count' }] },
			},
		} as Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>);

		const keys = await fetchFieldKeysForQuery({
			builderQueryType: 'builder_ai_query',
			dataSource: DataSource.TRACES,
			searchText: 'llm',
		});

		expect(mockedAIKeys).toHaveBeenCalledWith({
			searchText: 'llm',
			fieldContext: undefined,
		});
		expect(mockedGenericKeys).not.toHaveBeenCalled();
		expect(keys.data.data).toStrictEqual({
			complete: true,
			keys: { llm_call_count: [{ name: 'llm_call_count' }] },
		});
	});

	it('forwards fieldContext to the ai_observability keys endpoint', async () => {
		mockedAIKeys.mockResolvedValue({
			status: 'success',
			data: { complete: true, keys: {} },
		} as Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>);

		await fetchFieldKeysForQuery({
			builderQueryType: 'builder_ai_query',
			dataSource: DataSource.TRACES,
			searchText: '',
			fieldContext: TelemetrytypesFieldContextDTO.trace,
		});

		expect(mockedAIKeys).toHaveBeenCalledWith({
			searchText: '',
			fieldContext: TelemetrytypesFieldContextDTO.trace,
		});
	});

	it('drops fieldContext for the generic endpoint, which cannot narrow on it', async () => {
		mockedGenericKeys.mockResolvedValue({
			data: { status: 'success', data: { complete: true, keys: {} } },
		} as Awaited<ReturnType<typeof getKeySuggestions>>);

		await fetchFieldKeysForQuery({
			builderQueryType: 'builder_query',
			dataSource: DataSource.TRACES,
			searchText: '',
			fieldContext: TelemetrytypesFieldContextDTO.trace,
		});

		expect(mockedGenericKeys).toHaveBeenCalledWith(
			expect.not.objectContaining({ fieldContext: expect.anything() }),
		);
	});

	it.each<[string, 'builder_query' | undefined]>([
		['an unmarked query', undefined],
		['an explicitly generic query', 'builder_query'],
	])('reads the generic endpoint for %s', async (_label, builderQueryType) => {
		mockedGenericKeys.mockResolvedValue({
			data: { status: 'success', data: { complete: true, keys: {} } },
		} as Awaited<ReturnType<typeof getKeySuggestions>>);

		await fetchFieldKeysForQuery({
			builderQueryType,
			dataSource: DataSource.TRACES,
			searchText: 'svc',
		});

		expect(mockedAIKeys).not.toHaveBeenCalled();
		expect(mockedGenericKeys).toHaveBeenCalledWith(
			expect.objectContaining({ signal: DataSource.TRACES, searchText: 'svc' }),
		);
	});

	it('normalizes a null ai_observability keys payload to an empty map', async () => {
		mockedAIKeys.mockResolvedValue({
			status: 'success',
			data: { complete: false, keys: null },
		} as Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>);

		const response = await fetchFieldKeysForQuery({
			builderQueryType: 'builder_ai_query',
			dataSource: DataSource.TRACES,
			searchText: '',
		});

		expect(response.data.data).toStrictEqual({ complete: false, keys: {} });
	});

	it('passes the generic response through untouched', async () => {
		const genericResponse = {
			data: { status: 'success', data: { complete: true, keys: {} } },
		} as unknown as Awaited<ReturnType<typeof getKeySuggestions>>;
		mockedGenericKeys.mockResolvedValue(genericResponse);

		await expect(
			fetchFieldKeysForQuery({
				builderQueryType: 'builder_query',
				dataSource: DataSource.TRACES,
				searchText: '',
			}),
		).resolves.toBe(genericResponse);
	});
});

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
