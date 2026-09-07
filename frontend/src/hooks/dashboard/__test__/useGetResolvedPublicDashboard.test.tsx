import { renderHook, waitFor } from '@testing-library/react';
import { getPublicDashboardDataV2 } from 'api/generated/services/dashboard';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import {
	PublicDashboardSchema,
	useGetResolvedPublicDashboard,
} from '../useGetResolvedPublicDashboard';

jest.mock('api/generated/services/dashboard', () => ({
	getPublicDashboardDataV2: jest.fn(),
}));

const mockV2 = getPublicDashboardDataV2 as jest.Mock;

const wrapper = ({ children }: { children: ReactNode }): JSX.Element => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

// A schema mismatch on the v2 endpoint surfaces as an AxiosError with HTTP 501 and this
// error code; anything else must surface as an error, not as "legacy".
const schemaMismatchError = {
	isAxiosError: true,
	response: {
		status: 501,
		data: { error: { code: 'dashboard_invalid_data', message: 'not in v6' } },
	},
};

describe('useGetResolvedPublicDashboard', () => {
	beforeEach(() => {
		mockV2.mockReset();
	});

	it('returns the v2 model when the v2 endpoint succeeds', async () => {
		mockV2.mockResolvedValue({ status: 'success', data: { dashboard: {} } });

		const { result } = renderHook(() => useGetResolvedPublicDashboard('id-1'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.schema).toBe(PublicDashboardSchema.V2);
		expect(mockV2).toHaveBeenCalledWith({ id: 'id-1' });
	});

	it('resolves to legacy when the v2 endpoint reports a schema mismatch', async () => {
		mockV2.mockRejectedValue(schemaMismatchError);

		const { result } = renderHook(() => useGetResolvedPublicDashboard('id-2'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.schema).toBe(PublicDashboardSchema.Legacy);
	});

	it('surfaces a non-schema-mismatch v2 error as an error, not as legacy', async () => {
		mockV2.mockRejectedValue({
			isAxiosError: true,
			response: { status: 500, data: { error: { code: 'internal' } } },
		});

		const { result } = renderHook(() => useGetResolvedPublicDashboard('id-3'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(result.current.data).toBeUndefined();
	});

	it('does not fetch without an id', () => {
		renderHook(() => useGetResolvedPublicDashboard(''), { wrapper });
		expect(mockV2).not.toHaveBeenCalled();
	});
});
