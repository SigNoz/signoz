import { QueryClient } from 'react-query';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import { fetchFieldKeys, mergeStatics, toFieldKeys } from '../fieldKeys';

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

describe('fieldKeys', () => {
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

	it('prepends static fields in select without sending them as params', async () => {
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
				staticFields: [{ name: 'last_activity_time' } as TelemetryFieldKey],
			},
			DataSource.TRACES,
			'',
		);

		expect(seen[0]?.get('searchText')).toBe('');
		expect(Array.from(seen[0]?.keys() ?? [])).not.toContain('staticFields');
		expect(keys.map((key) => key.name)).toStrictEqual([
			'last_activity_time',
			'total_tokens',
		]);
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

	it('drops fetched keys that share a name with a static field', () => {
		expect(
			mergeStatics(
				[{ name: 'trace_id' } as TelemetryFieldKey],
				[
					{ name: 'trace_id' } as TelemetryFieldKey,
					{ name: 'total_tokens' } as TelemetryFieldKey,
				],
				'',
			).map((key) => key.name),
		).toStrictEqual(['trace_id', 'total_tokens']);
	});

	it('filters static fields by search text', () => {
		expect(
			mergeStatics(
				[
					{ name: 'last_activity_time' } as TelemetryFieldKey,
					{ name: 'timestamp' } as TelemetryFieldKey,
				],
				[],
				'activity',
			).map((key) => key.name),
		).toStrictEqual(['last_activity_time']);
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
