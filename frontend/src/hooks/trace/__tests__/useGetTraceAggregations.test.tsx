import { renderHook, waitFor } from '@testing-library/react';
import getTraceAggregations from 'api/trace/getTraceAggregations';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import useGetTraceAggregations from '../useGetTraceAggregations';

jest.mock('api/trace/getTraceAggregations', () => ({
	__esModule: true,
	default: jest.fn().mockResolvedValue({ httpStatusCode: 200, data: [] }),
}));

const mockApi = getTraceAggregations as jest.Mock;

const wrapper = ({ children }: { children: ReactNode }): JSX.Element => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const aggregations = [
	{ field: { name: 'service.name' }, aggregation: 'execution_time_percentage' },
] as never;

describe('useGetTraceAggregations', () => {
	beforeEach(() => mockApi.mockClear());

	it('fetches when enabled with a traceId and aggregations', async () => {
		renderHook(
			() =>
				useGetTraceAggregations({ traceId: 't1', aggregations, enabled: true }),
			{ wrapper },
		);
		await waitFor(() => expect(mockApi).toHaveBeenCalledTimes(1));
		expect(mockApi).toHaveBeenCalledWith({ traceId: 't1', aggregations });
	});

	it('does not fetch when disabled', () => {
		renderHook(
			() =>
				useGetTraceAggregations({ traceId: 't1', aggregations, enabled: false }),
			{ wrapper },
		);
		expect(mockApi).not.toHaveBeenCalled();
	});

	it('does not fetch without a traceId', () => {
		renderHook(
			() => useGetTraceAggregations({ traceId: '', aggregations, enabled: true }),
			{ wrapper },
		);
		expect(mockApi).not.toHaveBeenCalled();
	});

	it('does not fetch with no aggregations requested', () => {
		renderHook(
			() =>
				useGetTraceAggregations({ traceId: 't1', aggregations: [], enabled: true }),
			{ wrapper },
		);
		expect(mockApi).not.toHaveBeenCalled();
	});
});
