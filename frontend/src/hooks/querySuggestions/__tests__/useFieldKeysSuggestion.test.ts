import { QueryClient } from 'react-query';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { FieldKeysConfig, FieldKeysResponse } from 'api/querySuggestions/types';
import { BuilderQueryType, TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DATA_SOURCE_TO_SIGNAL, DataSource } from 'types/common/queryBuilder';

import {
	getFieldKeysQueryOptions,
	toFieldKeys,
} from '../useFieldKeysSuggestion';

/** Drives the options object the way react-query does, without a client. */
const fetchKeys = async (
	fieldKeysConfig: FieldKeysConfig,
	builderQueryType?: BuilderQueryType,
): Promise<TelemetryFieldKey[]> => {
	const { queryFn, select } = getFieldKeysQueryOptions(
		fieldKeysConfig,
		builderQueryType,
	);
	const response = await (
		queryFn as (context: { signal: AbortSignal }) => Promise<FieldKeysResponse>
	)({ signal: new AbortController().signal });

	return select?.(response) ?? [];
};

const mockKeys = (
	path: '/api/v1/ai_observability/fields/keys' | '/api/v1/fields/keys',
	names: string[],
	onRequest?: (params: URLSearchParams) => void,
): void => {
	server.use(
		rest.get(`${ENVIRONMENT.baseURL}${path}`, (req, res, ctx) => {
			onRequest?.(req.url.searchParams);
			return res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						complete: true,
						keys: Object.fromEntries(names.map((name) => [name, [{ name }]])),
					},
				}),
			);
		}),
	);
};

describe('useFieldKeysSuggestion', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
	});

	it('reads the ai_observability endpoint for a builder_ai_query', async () => {
		const seen: URLSearchParams[] = [];
		mockKeys(
			'/api/v1/ai_observability/fields/keys',
			['total_tokens'],
			(params) => {
				seen.push(params);
			},
		);

		const keys = await fetchKeys(
			{
				signal: DATA_SOURCE_TO_SIGNAL[DataSource.TRACES],
				searchText: 'llm',
				fieldContext: TelemetrytypesFieldContextDTO.trace,
			},
			'builder_ai_query',
		);

		expect(seen).toHaveLength(1);
		expect(seen[0]?.get('searchText')).toBe('llm');
		expect(seen[0]?.get('fieldContext')).toBe(
			TelemetrytypesFieldContextDTO.trace,
		);
		expect(keys.map((key) => key.name)).toStrictEqual(['total_tokens']);
	});

	it('reads the generic endpoint for an unmarked query', async () => {
		const seen: URLSearchParams[] = [];
		mockKeys('/api/v1/fields/keys', ['service.name'], (params) => {
			seen.push(params);
		});

		const keys = await fetchKeys({
			signal: DATA_SOURCE_TO_SIGNAL[DataSource.TRACES],
			searchText: 'svc',
		});

		expect(seen).toHaveLength(1);
		expect(seen[0]?.get('signal')).toBe(DataSource.TRACES);
		expect(seen[0]?.get('searchText')).toBe('svc');
		expect(keys.map((key) => key.name)).toStrictEqual(['service.name']);
	});

	it('reads the trace context of the ai_observability endpoint', async () => {
		const seen: URLSearchParams[] = [];
		mockKeys(
			'/api/v1/ai_observability/fields/keys',
			['total_tokens'],
			(params) => {
				seen.push(params);
			},
		);

		const keys = await fetchKeys(
			{
				signal: DATA_SOURCE_TO_SIGNAL[DataSource.TRACES],
				searchText: '',
				fieldContext: TelemetrytypesFieldContextDTO.trace,
			},
			'builder_ai_query',
		);

		expect(seen[0]?.get('searchText')).toBe('');
		expect(keys.map((key) => key.name)).toStrictEqual(['total_tokens']);
	});

	it('reuses the cached keys response for a second empty search', async () => {
		const seen: URLSearchParams[] = [];
		mockKeys(
			'/api/v1/ai_observability/fields/keys',
			['total_tokens'],
			(params) => {
				seen.push(params);
			},
		);

		const fieldKeysConfig = {
			signal: DATA_SOURCE_TO_SIGNAL[DataSource.TRACES],
			searchText: '',
			fieldContext: TelemetrytypesFieldContextDTO.trace,
		};

		// Built twice: equal keys must resolve to one cache entry, not two requests.
		await queryClient.fetchQuery(
			getFieldKeysQueryOptions(fieldKeysConfig, 'builder_ai_query'),
		);
		await queryClient.fetchQuery(
			getFieldKeysQueryOptions(fieldKeysConfig, 'builder_ai_query'),
		);

		expect(seen).toHaveLength(1);
	});

	it('hands the query signal to the fetcher so a superseded search aborts', async () => {
		server.use(
			rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/keys`, (_req, res, ctx) =>
				res(ctx.delay(500), ctx.status(200), ctx.json({ status: 'success' })),
			),
		);

		const controller = new AbortController();
		const { queryFn } = getFieldKeysQueryOptions({
			signal: DATA_SOURCE_TO_SIGNAL[DataSource.LOGS],
			searchText: 'svc',
		});
		const pending = (
			queryFn as (context: { signal: AbortSignal }) => Promise<unknown>
		)({ signal: controller.signal });

		controller.abort();

		await expect(pending).rejects.toBeDefined();
	});

	it('treats a null keys map as empty', () => {
		expect(
			toFieldKeys({
				status: 'success',
				data: { complete: false, keys: null },
			}),
		).toStrictEqual([]);
	});
});
