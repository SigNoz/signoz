import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider, UseQueryResult } from 'react-query';
import { renderHook, RenderHookResult, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { queryRangeV5 } from 'api/generated/services/querier';
import type {
	Querybuildertypesv5QueryRangeRequestDTO,
	QueryRangeV5200,
} from 'api/generated/services/sigNoz.schemas';

import { useGetQueryRangeV5 } from '../useGetQueryRangeV5';

jest.mock('api/generated/services/querier', () => ({
	queryRangeV5: jest.fn(),
}));

const mockQueryRangeV5 = queryRangeV5 as jest.Mock;

const REQUEST = {} as Querybuildertypesv5QueryRangeRequestDTO;
const KEY_A = ['query-range', 'panel-1', 'window-a'];
const KEY_B = ['query-range', 'panel-1', 'window-b'];

function clientError(): AxiosError {
	return new AxiosError('bad query', 'ERR_BAD_REQUEST', undefined, undefined, {
		status: 400,
		statusText: 'Bad Request',
		data: {},
		headers: {},
		config: { headers: new AxiosHeaders() },
	});
}

interface Props {
	enabled: boolean;
	queryKey?: unknown[];
}

function renderQuery(
	initial: Props,
	client = new QueryClient(),
): RenderHookResult<UseQueryResult<QueryRangeV5200, Error>, Props> {
	const wrapper = ({ children }: PropsWithChildren): JSX.Element => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return renderHook(
		({ enabled, queryKey = KEY_A }: Props) =>
			useGetQueryRangeV5({ requestPayload: REQUEST, queryKey, enabled }),
		{ wrapper, initialProps: initial },
	);
}

describe('useGetQueryRangeV5 enabled gating', () => {
	beforeEach(() => {
		mockQueryRangeV5.mockReset();
	});

	it('does not fetch while disabled and fetches once when enabled', async () => {
		mockQueryRangeV5.mockResolvedValue({ status: 'success', data: {} });
		const { rerender } = renderQuery({ enabled: false });
		expect(mockQueryRangeV5).not.toHaveBeenCalled();

		rerender({ enabled: true });
		await waitFor(() => expect(mockQueryRangeV5).toHaveBeenCalledTimes(1));
	});

	it('serves a successful key from cache when re-enabled', async () => {
		mockQueryRangeV5.mockResolvedValue({ status: 'success', data: {} });
		const { result, rerender } = renderQuery({ enabled: true });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		rerender({ enabled: false });
		rerender({ enabled: true });
		await waitFor(() => expect(result.current.isFetching).toBe(false));
		expect(mockQueryRangeV5).toHaveBeenCalledTimes(1);
	});

	it('does not re-run an errored key when re-enabled', async () => {
		mockQueryRangeV5.mockRejectedValue(clientError());
		const { result, rerender } = renderQuery({ enabled: true });
		await waitFor(() => expect(result.current.isError).toBe(true));

		rerender({ enabled: false });
		rerender({ enabled: true });
		await waitFor(() => expect(result.current.isFetching).toBe(false));
		expect(mockQueryRangeV5).toHaveBeenCalledTimes(1);
		expect(result.current.isError).toBe(true);
	});

	it('still gates a new key while disabled after a prior key errored', async () => {
		mockQueryRangeV5.mockRejectedValue(clientError());
		const { result, rerender } = renderQuery({ enabled: true });
		await waitFor(() => expect(result.current.isError).toBe(true));

		rerender({ enabled: false });
		rerender({ enabled: false, queryKey: KEY_B });
		await waitFor(() => expect(result.current.isFetching).toBe(false));
		expect(mockQueryRangeV5).toHaveBeenCalledTimes(1);

		rerender({ enabled: true, queryKey: KEY_B });
		await waitFor(() => expect(mockQueryRangeV5).toHaveBeenCalledTimes(2));
	});

	it('re-runs an errored key on manual refetch', async () => {
		mockQueryRangeV5.mockRejectedValue(clientError());
		const { result } = renderQuery({ enabled: true });
		await waitFor(() => expect(result.current.isError).toBe(true));

		mockQueryRangeV5.mockResolvedValue({ status: 'success', data: {} });
		await result.current.refetch();
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(mockQueryRangeV5).toHaveBeenCalledTimes(2);
	});
});
