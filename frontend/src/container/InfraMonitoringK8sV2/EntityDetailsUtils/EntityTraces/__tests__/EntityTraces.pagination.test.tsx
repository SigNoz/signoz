import { act, waitFor } from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import { renderEntityTraces, verifyQueryPayload } from './testUtils';
import { mockQueryRangeV5WithTracesResponse } from '__tests__/query_range_v5.util';

describe('EntityTraces - Pagination', () => {
	let capturedPayloads: QueryRangePayloadV5[] = [];

	beforeEach(() => {
		capturedPayloads = [];
		mockQueryRangeV5WithTracesResponse({
			onReceiveRequest: async (req) => {
				const body = (await req.json()) as QueryRangePayloadV5;
				capturedPayloads.push(body);
				return {};
			},
		});
	});

	it('should use default limit when no pagination provided', async () => {
		act(() => {
			renderEntityTraces();
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		const spec = capturedPayloads[0].compositeQuery.queries[0]?.spec as {
			limit?: number;
		};
		expect(spec.limit).toBe(10);
	});

	it('should use custom offset from pagination param', async () => {
		act(() => {
			renderEntityTraces({ pagination: { offset: 20, limit: 10 } });
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		verifyQueryPayload({
			payload: capturedPayloads[0],
			expectedOffset: 20,
		});
	});

	it('should use custom limit from pagination param', async () => {
		act(() => {
			renderEntityTraces({ pagination: { offset: 0, limit: 50 } });
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		verifyQueryPayload({
			payload: capturedPayloads[0],
			expectedLimit: 50,
		});
	});

	it('should default offset to 0', async () => {
		act(() => {
			renderEntityTraces();
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		verifyQueryPayload({
			payload: capturedPayloads[0],
			expectedOffset: 0,
		});
	});

	it('should combine offset and limit correctly', async () => {
		act(() => {
			renderEntityTraces({ pagination: { offset: 30, limit: 20 } });
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		verifyQueryPayload({
			payload: capturedPayloads[0],
			expectedOffset: 30,
			expectedLimit: 20,
		});
	});
});
