import { QueryClient, QueryClientProvider, UseQueryResult } from 'react-query';
import { Router } from 'react-router-dom';
import {
	act,
	renderHook,
	RenderHookResult,
	waitFor,
} from '@testing-library/react';
import { GetRoutingPoliciesResponse } from 'api/routingPolicies/getRoutingPolicies';
import { createMemoryHistory } from 'history';
import { SuccessResponseV2 } from 'types/api';

import { UseRoutingPoliciesReturn } from '../types';
import useRoutingPolicies from '../useRoutingPolicies';
import {
	convertRoutingPolicyToApiResponse,
	MOCK_CHANNEL_1,
	MOCK_CHANNEL_2,
	MOCK_ROUTING_POLICY_1,
	MOCK_ROUTING_POLICY_2,
} from './testUtils';

const {
	mockHistoryReplace,
	mockDebouncedFn,
	mockRefetchRoutingPolicies,
	mockCreateRoutingPolicy,
	mockUpdateRoutingPolicy,
	mockDeleteRoutingPolicy,
} = vi.hoisted(() => ({
	mockHistoryReplace: vi.fn(),
	mockDebouncedFn: vi.fn((fn: () => void) => fn),
	mockRefetchRoutingPolicies: vi.fn(),
	mockCreateRoutingPolicy: vi.fn(),
	mockUpdateRoutingPolicy: vi.fn(),
	mockDeleteRoutingPolicy: vi.fn(),
}));
vi.mock('react-router-dom', async () => {
	const actual = (await vi.importActual('react-router-dom')) as any;
	return {
		...actual,
		useHistory: (): any => ({
			...actual.useHistory(),
			replace: mockHistoryReplace,
		}),
	};
});

vi.mock('hooks/useDebouncedFunction', () => ({
	__esModule: true,
	default: (fn: () => void): (() => void) => mockDebouncedFn(fn),
}));

vi.mock('hooks/routingPolicies/useGetRoutingPolicies', () => ({
	useGetRoutingPolicies: (): UseQueryResult<
		SuccessResponseV2<GetRoutingPoliciesResponse>,
		Error
	> =>
		({
			data: {
				data: {
					data: [
						convertRoutingPolicyToApiResponse(MOCK_ROUTING_POLICY_1),
						convertRoutingPolicyToApiResponse(MOCK_ROUTING_POLICY_2),
					],
				},
			},
			refetch: mockRefetchRoutingPolicies,
			isFetching: false,
			isLoading: false,
			isError: false,
		}) as any,
}));
vi.mock('hooks/routingPolicies/useCreateRoutingPolicy', () => ({
	useCreateRoutingPolicy: (): any => ({
		mutate: mockCreateRoutingPolicy,
		isLoading: false,
	}),
}));
vi.mock('hooks/routingPolicies/useUpdateRoutingPolicy', () => ({
	useUpdateRoutingPolicy: (): any => ({
		mutate: mockUpdateRoutingPolicy,
		isLoading: false,
	}),
}));
vi.mock('hooks/routingPolicies/useDeleteRoutingPolicy', () => ({
	useDeleteRoutingPolicy: (): any => ({
		mutate: mockDeleteRoutingPolicy,
		isLoading: false,
	}),
}));
vi.mock('api/channels/getAll', () => ({
	__esModule: true,
	default: (): any =>
		Promise.resolve({
			data: [MOCK_CHANNEL_1, MOCK_CHANNEL_2],
		}),
}));

const ROUTING_POLICY_1_NAME = 'Routing Policy 1';
const TEST_SEARCH_TERM = 'test search';

describe('useRoutingPolicies', () => {
	let queryClient: QueryClient;

	const renderHookWithWrapper = (
		initialEntries: string[] = ['/alerts'],
	): RenderHookResult<UseRoutingPoliciesReturn, unknown> => {
		const history = createMemoryHistory({ initialEntries });

		const wrapper = ({
			children,
		}: {
			children: React.ReactNode;
		}): React.ReactElement => (
			<QueryClientProvider client={queryClient}>
				<Router history={history}>{children}</Router>
			</QueryClientProvider>
		);

		return renderHook(() => useRoutingPolicies(), { wrapper });
	};

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
	});

	it('should return all policies when search term is empty', () => {
		const { result } = renderHookWithWrapper();

		expect(result.current.searchTerm).toBe('');
		expect(result.current.routingPoliciesData).toHaveLength(2);
		expect(result.current.routingPoliciesData).toStrictEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: MOCK_ROUTING_POLICY_1.name }),
				expect.objectContaining({ name: MOCK_ROUTING_POLICY_2.name }),
			]),
		);
	});

	it('should filter policies exactly matching the search term', () => {
		const { result } = renderHookWithWrapper();

		act(() => {
			result.current.setSearchTerm(MOCK_ROUTING_POLICY_1.name);
		});

		expect(result.current.searchTerm).toBe(MOCK_ROUTING_POLICY_1.name);
		expect(result.current.routingPoliciesData).toHaveLength(1);
		expect(result.current.routingPoliciesData[0].name).toBe(
			MOCK_ROUTING_POLICY_1.name,
		);
	});

	it('should filter policies partially matching the search term', () => {
		const { result } = renderHookWithWrapper();

		act(() => {
			result.current.setSearchTerm('Policy 1');
		});

		expect(result.current.searchTerm).toBe('Policy 1');
		expect(result.current.routingPoliciesData).toHaveLength(1);
		expect(result.current.routingPoliciesData[0].name).toBe(
			MOCK_ROUTING_POLICY_1.name,
		);
	});

	it('should return empty array when no policies match the search term', () => {
		const { result } = renderHookWithWrapper();

		act(() => {
			result.current.setSearchTerm('random search term');
		});

		expect(result.current.searchTerm).toBe('random search term');
		expect(result.current.routingPoliciesData).toHaveLength(0);
	});

	it('should initialize search term from URL query parameter', () => {
		const { result } = renderHookWithWrapper([
			`/alerts?search=${encodeURIComponent(ROUTING_POLICY_1_NAME)}`,
		]);

		expect(result.current.searchTerm).toBe(ROUTING_POLICY_1_NAME);
		expect(result.current.routingPoliciesData).toHaveLength(1);
		expect(result.current.routingPoliciesData[0].name).toBe(
			ROUTING_POLICY_1_NAME,
		);
	});

	it('should initialize with empty search when no search param in URL', () => {
		const { result } = renderHookWithWrapper(['/alerts']);

		expect(result.current.searchTerm).toBe('');
		expect(result.current.routingPoliciesData).toHaveLength(2);
	});

	it('should update URL when search term is set', async () => {
		const { result } = renderHookWithWrapper();

		act(() => {
			result.current.setSearchTerm(TEST_SEARCH_TERM);
		});

		await waitFor(() => {
			expect(mockHistoryReplace).toHaveBeenCalled();
		});

		const callArg = mockHistoryReplace.mock.calls[0][0];
		expect(callArg).toContain('search=test+search');
	});

	it('should remove search param from URL when search is cleared', async () => {
		const { result } = renderHookWithWrapper(['/alerts?search=existing']);

		act(() => {
			result.current.setSearchTerm('');
		});

		await waitFor(() => {
			expect(mockHistoryReplace).toHaveBeenCalled();
		});

		const callArg = mockHistoryReplace.mock.calls[0][0];
		expect(callArg).toBe('/alerts?');
	});

	it('should filter policies by description', () => {
		const { result } = renderHookWithWrapper();

		act(() => {
			result.current.setSearchTerm(MOCK_ROUTING_POLICY_1.description || '');
		});

		expect(result.current.searchTerm).toBe(MOCK_ROUTING_POLICY_1.description);
		expect(result.current.routingPoliciesData).toHaveLength(1);
		expect(result.current.routingPoliciesData[0].description).toBe(
			MOCK_ROUTING_POLICY_1.description,
		);
	});
});
