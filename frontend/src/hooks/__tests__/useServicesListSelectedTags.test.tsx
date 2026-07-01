import { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useServicesListSelectedTags } from '../useServicesListSelectedTags';

jest.mock('hooks/dynamicVariables/useGetFieldKeys', () => ({
	useGetFieldKeys: jest.fn(),
}));

jest.mock('hooks/useResourceAttribute', () => ({
	__esModule: true,
	default: jest.fn(),
}));

import { useGetFieldKeys } from 'hooks/dynamicVariables/useGetFieldKeys';
import useResourceAttribute from 'hooks/useResourceAttribute';

const mockUseGetFieldKeys = useGetFieldKeys as jest.MockedFunction<
	typeof useGetFieldKeys
>;
const mockUseResourceAttribute = useResourceAttribute as jest.MockedFunction<
	typeof useResourceAttribute
>;

function createWrapper(): ({ children }: { children: ReactNode }) => JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

describe('useServicesListSelectedTags', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('filters out deployment.environment when it is missing from traces metadata', async () => {
		mockUseResourceAttribute.mockReturnValue({
			queries: [
				{
					id: '1',
					tagKey: 'resource_deployment_environment',
					operator: 'IN',
					tagValue: ['prod'],
				},
			],
		} as ReturnType<typeof useResourceAttribute>);

		mockUseGetFieldKeys.mockReturnValue({
			data: {
				data: {
					keys: {
						'service.name': [],
					},
					complete: true,
				},
			},
			isLoading: false,
			isError: false,
		} as ReturnType<typeof useGetFieldKeys>);

		const { result } = renderHook(() => useServicesListSelectedTags(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isReady).toBe(true);
		});

		expect(result.current.selectedTags).toEqual([]);
	});
});
