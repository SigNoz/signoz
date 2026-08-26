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

		expect(mockedAIKeys).toHaveBeenCalledWith({ searchText: 'llm' });
		expect(mockedGenericKeys).not.toHaveBeenCalled();
		expect(keys).toStrictEqual({
			llm_call_count: [{ name: 'llm_call_count' }],
		});
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

	it('normalizes a null ai_observability keys payload to undefined', async () => {
		mockedAIKeys.mockResolvedValue({
			status: 'success',
			data: { complete: false, keys: null },
		} as Awaited<ReturnType<typeof getAIObservabilityFieldsKeys>>);

		await expect(
			fetchFieldKeysForQuery({
				builderQueryType: 'builder_ai_query',
				dataSource: DataSource.TRACES,
				searchText: '',
			}),
		).resolves.toBeUndefined();
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

		const values = await fetchFieldValuesForQuery({
			builderQueryType: 'builder_ai_query',
			dataSource: DataSource.TRACES,
			key: 'gen_ai.request.model',
			searchText: 'gpt',
			fieldContext: 'attribute',
		});

		expect(mockedGenericValues).not.toHaveBeenCalled();
		expect(values).toStrictEqual({
			stringValues: ['gpt-4o'],
			numberValues: [],
			complete: true,
		});
	});

	it('forwards fieldContext so the endpoint can short-circuit trace aggregates', async () => {
		mockedAIValues.mockResolvedValue(aiValuesResponse({}));

		const values = await fetchFieldValuesForQuery({
			builderQueryType: 'builder_ai_query',
			dataSource: DataSource.TRACES,
			key: 'total_tokens',
			searchText: '',
			fieldContext: 'trace',
		});

		expect(mockedAIValues).toHaveBeenCalledWith({
			name: 'total_tokens',
			searchText: '',
			fieldContext: TelemetrytypesFieldContextDTO.trace,
		});
		expect(values).toStrictEqual({
			stringValues: [],
			numberValues: [],
			complete: true,
		});
	});

	it('normalizes a null ai_observability values payload to empty lists', async () => {
		mockedAIValues.mockResolvedValue(aiValuesResponse(null, false));

		await expect(
			fetchFieldValuesForQuery({
				builderQueryType: 'builder_ai_query',
				dataSource: DataSource.TRACES,
				key: 'llm_call_count',
				searchText: '',
				fieldContext: 'trace',
			}),
		).resolves.toStrictEqual({
			stringValues: [],
			numberValues: [],
			complete: false,
		});
	});

	it.each<[string, 'builder_query' | undefined]>([
		['an unmarked query', undefined],
		['an explicitly generic query', 'builder_query'],
	])('reads the generic endpoint for %s', async (_label, builderQueryType) => {
		mockedGenericValues.mockResolvedValue({
			data: {
				data: { complete: false, values: { stringValues: ['frontend'] } },
			},
		} as unknown as Awaited<ReturnType<typeof getValueSuggestions>>);

		const values = await fetchFieldValuesForQuery({
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
		expect(values).toStrictEqual({
			stringValues: ['frontend'],
			numberValues: [],
			complete: false,
		});
	});

	it('falls back to empty lists when the generic endpoint returns no data', async () => {
		mockedGenericValues.mockResolvedValue({ data: {} } as unknown as Awaited<
			ReturnType<typeof getValueSuggestions>
		>);

		await expect(
			fetchFieldValuesForQuery({
				builderQueryType: 'builder_query',
				dataSource: DataSource.TRACES,
				key: 'service.name',
				searchText: '',
			}),
		).resolves.toStrictEqual({
			stringValues: [],
			numberValues: [],
			complete: false,
		});
	});
});
