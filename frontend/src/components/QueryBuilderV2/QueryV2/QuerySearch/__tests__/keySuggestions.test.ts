import { getAIObservabilityFieldsKeys } from 'api/generated/services/ai-observability';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { DataSource } from 'types/common/queryBuilder';

import { fetchFieldKeysForQuery } from '../keySuggestions';

jest.mock('api/generated/services/ai-observability', () => ({
	getAIObservabilityFieldsKeys: jest.fn(),
}));

jest.mock('api/querySuggestions/getKeySuggestions', () => ({
	getKeySuggestions: jest.fn(),
}));

const mockedAIKeys = getAIObservabilityFieldsKeys as jest.MockedFunction<
	typeof getAIObservabilityFieldsKeys
>;
const mockedGenericKeys = getKeySuggestions as jest.MockedFunction<
	typeof getKeySuggestions
>;

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
		expect(keys).toStrictEqual({
			llm_call_count: [{ name: 'llm_call_count' }],
		});
	});

	it('forwards fieldContext to the ai_observability endpoint', async () => {
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
