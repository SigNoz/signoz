import { renderHook, waitFor } from '@testing-library/react';
import { getPublicDashboardDataV2 } from 'api/generated/services/dashboard';
import getPublicDashboardDataAPI from 'api/dashboard/public/getPublicDashboardData';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import {
	PublicDashboardSchema,
	useGetResolvedPublicDashboard,
} from '../useGetResolvedPublicDashboard';

jest.mock('api/generated/services/dashboard', () => ({
	getPublicDashboardDataV2: jest.fn(),
}));
jest.mock('api/dashboard/public/getPublicDashboardData', () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockV2 = getPublicDashboardDataV2 as jest.Mock;
const mockV1 = getPublicDashboardDataAPI as jest.Mock;

const wrapper = ({ children }: { children: ReactNode }): JSX.Element => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

// A schema mismatch on the v2 endpoint surfaces as an AxiosError with HTTP 501 and this
// error code; anything else must NOT trigger the v1 fallback.
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
		mockV1.mockReset();
	});

	it('returns the v2 model when the v2 endpoint succeeds and never calls v1', async () => {
		mockV2.mockResolvedValue({ status: 'success', data: { dashboard: {} } });

		const { result } = renderHook(() => useGetResolvedPublicDashboard('id-1'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.schema).toBe(PublicDashboardSchema.V2);
		expect(mockV2).toHaveBeenCalledWith({ id: 'id-1' });
		expect(mockV1).not.toHaveBeenCalled();
	});

	it('falls back to v1 when the v2 endpoint reports a schema mismatch', async () => {
		mockV2.mockRejectedValue(schemaMismatchError);
		mockV1.mockResolvedValue({
			httpStatusCode: 200,
			data: { dashboard: { data: { title: 'v1' } } },
		});

		const { result } = renderHook(() => useGetResolvedPublicDashboard('id-2'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.schema).toBe(PublicDashboardSchema.V1);
		expect(mockV1).toHaveBeenCalledWith({ id: 'id-2' });
	});

	it('surfaces a non-schema-mismatch v2 error without falling back to v1', async () => {
		mockV2.mockRejectedValue({
			isAxiosError: true,
			response: { status: 500, data: { error: { code: 'internal' } } },
		});

		const { result } = renderHook(() => useGetResolvedPublicDashboard('id-3'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(mockV1).not.toHaveBeenCalled();
	});

	it('does not fetch without an id', () => {
		renderHook(() => useGetResolvedPublicDashboard(''), { wrapper });
		expect(mockV2).not.toHaveBeenCalled();
		expect(mockV1).not.toHaveBeenCalled();
	});
});
