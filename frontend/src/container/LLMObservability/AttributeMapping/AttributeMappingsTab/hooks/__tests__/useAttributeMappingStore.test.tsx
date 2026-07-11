import { QueryClient, QueryClientProvider } from 'react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
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

	// Regression guard for the "empty mappers after save" bug: on save the groups
	// list must be *invalidated* in place (it stays mounted, so no flash), while
	// each per-group mapper list must be *removed* from the cache — invalidate
	// alone leaves an expanded group's table stale/empty because react-query keeps
	// `data` referentially stable when the list is unchanged, so the hydrate effect
	// never re-fires. This asserts the exact query-client calls and their key
	// targeting so a revert to invalidate-everything fails here.
	it('invalidates the groups list and removes cached mapper lists on save', async () => {
		server.use(
			rest.get(GROUPS_ENDPOINT, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(makeGroupsResponse(mockGroups))),
			),
		);

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
		const removeSpy = jest.spyOn(queryClient, 'removeQueries');

		const { result } = renderHook(() => useAttributeMappingStore(), {
			wrapper: function Wrapper({
				children,
			}: {
				children: React.ReactNode;
			}): React.ReactElement {
				return (
					<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
				);
			},
		});

		// Wait until the draft is initialised, otherwise save() no-ops early.
		await waitFor(() => expect(result.current.groups.length).toBeGreaterThan(0));

		await act(async () => {
			await result.current.save();
		});

		const groupsKey = ['/api/v1/span_mapper_groups'];
		const mappersKey = ['/api/v1/span_mapper_groups/group-1/span_mappers'];

		// Groups list: invalidated, and the predicate matches *only* the list key.
		expect(invalidateSpy).toHaveBeenCalledTimes(1);
		const invalidatePredicate = invalidateSpy.mock.calls[0][0] as unknown as {
			predicate: (query: { queryKey: unknown[] }) => boolean;
		};
		expect(invalidatePredicate.predicate({ queryKey: groupsKey })).toBe(true);
		expect(invalidatePredicate.predicate({ queryKey: mappersKey })).toBe(false);

		// Per-group mapper lists: removed, and the predicate matches *only* the
		// child mapper keys (never the groups list).
		expect(removeSpy).toHaveBeenCalledTimes(1);
		const removeFilters = removeSpy.mock.calls[0][0] as unknown as {
			predicate: (query: { queryKey: unknown[] }) => boolean;
		};
		expect(removeFilters.predicate({ queryKey: mappersKey })).toBe(true);
		expect(removeFilters.predicate({ queryKey: groupsKey })).toBe(false);
	});
});
