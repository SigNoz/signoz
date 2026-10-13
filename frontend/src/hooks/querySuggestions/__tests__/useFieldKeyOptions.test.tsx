import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';

import { useFieldKeyOptions } from '../useFieldKeyOptions';

const fieldKeysURL = `${ENVIRONMENT.baseURL}/api/v1/fields/keys`;

const keysBody = (
	variants: { name: string; fieldContext: string }[],
): Record<string, unknown> => ({
	status: 'success',
	data: {
		complete: true,
		keys: Object.fromEntries(variants.map((v) => [v.name, [v]])),
	},
});

const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
	<QueryClientProvider
		client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
	>
		{children}
	</QueryClientProvider>
);

const renderOptions = (initial: {
	searchText: string;
	metricName?: string;
}): ReturnType<
	typeof renderHook<ReturnType<typeof useFieldKeyOptions>, typeof initial>
> =>
	renderHook(
		(props) =>
			useFieldKeyOptions({
				fieldKeysConfig: {
					signal: TelemetrytypesSignalDTO.metrics,
					searchText: props.searchText,
					metricName: props.metricName,
				},
				enabled: true,
			}),
		{ wrapper, initialProps: initial },
	);

describe('useFieldKeyOptions', () => {
	beforeAll(() => server.listen());
	afterEach(() => server.resetHandlers());
	afterAll(() => server.close());

	it('keeps the previous rows across a search text change', async () => {
		let release: () => void = () => {};
		let parked = false;
		server.use(
			rest.get(fieldKeysURL, async (req, res, ctx) => {
				if (req.url.searchParams.get('searchText') === 'host') {
					await new Promise<void>((resolve) => {
						release = resolve;
						parked = true;
					});
					return res(
						ctx.status(200),
						ctx.json(keysBody([{ name: 'host.name', fieldContext: 'resource' }])),
					);
				}
				return res(
					ctx.status(200),
					ctx.json(keysBody([{ name: 'service.name', fieldContext: 'resource' }])),
				);
			}),
		);
		const { result, rerender } = renderOptions({ searchText: '' });
		await waitFor(() =>
			expect(result.current.options.map((o) => o.label)).toStrictEqual([
				'service.name',
			]),
		);

		rerender({ searchText: 'host' });
		await waitFor(() => expect(parked).toBe(true));
		expect(result.current.options.map((o) => o.label)).toStrictEqual([
			'service.name',
		]);

		release();
		await waitFor(() =>
			expect(result.current.options.map((o) => o.label)).toStrictEqual([
				'host.name',
			]),
		);
	});

	it('starts from empty when the metric changes', async () => {
		let release: () => void = () => {};
		let parked = false;
		server.use(
			rest.get(fieldKeysURL, async (req, res, ctx) => {
				if (req.url.searchParams.get('metricName') === 'other_metric') {
					await new Promise<void>((resolve) => {
						release = resolve;
						parked = true;
					});
					return res(
						ctx.status(200),
						ctx.json(keysBody([{ name: 'other.label', fieldContext: 'attribute' }])),
					);
				}
				return res(
					ctx.status(200),
					ctx.json(keysBody([{ name: 'service.name', fieldContext: 'resource' }])),
				);
			}),
		);
		const { result, rerender } = renderOptions({
			searchText: '',
			metricName: 'signoz_calls_total',
		});
		await waitFor(() =>
			expect(result.current.options.map((o) => o.label)).toStrictEqual([
				'service.name',
			]),
		);

		rerender({ searchText: '', metricName: 'other_metric' });
		await waitFor(() => expect(parked).toBe(true));
		expect(result.current.options).toStrictEqual([]);

		release();
		await waitFor(() =>
			expect(result.current.options.map((o) => o.label)).toStrictEqual([
				'other.label',
			]),
		);
	});
});
