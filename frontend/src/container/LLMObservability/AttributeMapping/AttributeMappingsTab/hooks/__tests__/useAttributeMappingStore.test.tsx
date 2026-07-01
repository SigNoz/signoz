import { QueryClient, QueryClientProvider } from 'react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { rest, server } from 'mocks-server/server';

import {
	GROUPS_ENDPOINT,
	makeGroupsResponse,
	mockGroups,
} from '../../../__tests__/fixtures';
import { useAttributeMappingStore } from '../useAttributeMappingStore';

function createWrapper(): ({
	children,
}: {
	children: React.ReactNode;
}) => React.ReactElement {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function Wrapper({
		children,
	}: {
		children: React.ReactNode;
	}): React.ReactElement {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

function renderStore(): ReturnType<
	typeof renderHook<ReturnType<typeof useAttributeMappingStore>, unknown>
> {
	return renderHook(() => useAttributeMappingStore(), {
		wrapper: createWrapper(),
	});
}

describe('useAttributeMappingStore', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('starts loading with no groups', () => {
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(makeGroupsResponse(mockGroups))),
			),
		);
		const { result } = renderStore();

		expect(result.current.isLoading).toBe(true);
		expect(result.current.groups).toStrictEqual([]);
	});

	it('builds a draft tree from the server groups once loaded', async () => {
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(makeGroupsResponse(mockGroups))),
			),
		);
		const { result } = renderStore();

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.groups).toHaveLength(2);
		expect(result.current.groups[0]).toStrictEqual({
			localId: 'group-1',
			serverId: 'group-1',
			name: 'demo',
			attributes: ['ai.embeddings'],
			resource: ['cloud.account.id'],
			enabled: true,
			mappers: [],
		});
		expect(result.current.isError).toBe(false);
	});

	it('surfaces isError when the groups request fails', async () => {
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) => res(ctx.status(500))),
		);
		const { result } = renderStore();

		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.groups).toStrictEqual([]);
	});
});
