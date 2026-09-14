import { QueryClient } from 'react-query';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

import {
	fetchFieldKeys,
	getFieldKeysQueryOptions,
	toFieldKeys,
} from '../useFieldKeysSuggestion';

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

		const keys = await fetchFieldKeys(
			queryClient,
			{
				builderQueryType: 'builder_ai_query',
				fieldContext: TelemetrytypesFieldContextDTO.trace,
			},
			DataSource.TRACES,
			'llm',
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

		const keys = await fetchFieldKeys(queryClient, {}, DataSource.TRACES, 'svc');

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

		const keys = await fetchFieldKeys(
			queryClient,
			{
				builderQueryType: 'builder_ai_query',
				fieldContext: TelemetrytypesFieldContextDTO.trace,
			},
			DataSource.TRACES,
			'',
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

		const config = {
			builderQueryType: 'builder_ai_query' as const,
			fieldContext: TelemetrytypesFieldContextDTO.trace,
		};

		await fetchFieldKeys(queryClient, config, DataSource.TRACES, '');
		await fetchFieldKeys(queryClient, config, DataSource.TRACES, '');

		expect(seen).toHaveLength(1);
	});

	it('hands the query signal to the fetcher so a superseded search aborts', async () => {
		server.use(
			rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/keys`, (_req, res, ctx) =>
				res(ctx.delay(500), ctx.status(200), ctx.json({ status: 'success' })),
			),
		);

		const controller = new AbortController();
		const { queryFn } = getFieldKeysQueryOptions({}, DataSource.LOGS, 'svc');
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
