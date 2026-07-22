import { act, waitFor } from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import { renderEntityTraces, verifyQueryPayload } from './testUtils';
import { mockQueryRangeV5WithTracesResponse } from '__tests__/query_range_v5.util';

describe('EntityTraces - Default Behavior', () => {
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

	it('should fetch traces using V5 API on initial render', async () => {
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

	it('should pass time range to API (converted to milliseconds)', async () => {
		const timeRange = { startTime: 1000, endTime: 2000 };

		act(() => {
			renderEntityTraces({ timeRange });
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		verifyQueryPayload({
			payload: capturedPayloads[0],
			expectedTimeRange: {
				start: timeRange.startTime * 1000,
				end: timeRange.endTime * 1000,
			},
		});
	});

	it('should order results by timestamp desc', async () => {
		act(() => {
			renderEntityTraces();
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		const spec = capturedPayloads[0].compositeQuery.queries[0]?.spec as {
			order?: Array<{ key: { name: string }; direction: string }>;
		};
		const timestampOrder = spec.order?.find((o) => o.key.name === 'timestamp');

		expect(timestampOrder?.direction).toBe('desc');
	});

	it('should use TRACES signal type', async () => {
		act(() => {
			renderEntityTraces();
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		const query = capturedPayloads[0].compositeQuery.queries[0];
		const spec = query?.spec as { signal?: string };
		expect(spec?.signal).toBe('traces');
	});

	it('should use raw request type for traces list view', async () => {
		act(() => {
			renderEntityTraces();
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		expect(capturedPayloads[0].requestType).toBe('raw');
	});
});
