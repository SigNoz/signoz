import { act, waitFor } from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import { renderEntityTraces } from './testUtils';
import { mockQueryRangeV5WithTracesResponse } from '__tests__/query_range_v5.util';

describe('EntityTraces - Expression', () => {
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

	it('should include expression in query filter', async () => {
		const expression = 'k8s.pod.name = "my-pod"';

		act(() => {
			renderEntityTraces({ expression });
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		const spec = capturedPayloads[0].compositeQuery.queries[0]?.spec as {
			filter?: { expression: string };
		};
		expect(spec.filter?.expression).toContain('k8s.pod.name');
	});

	it('should include complex expression with multiple conditions', async () => {
		const expression = 'k8s.pod.name = "my-pod" AND service.name = "api"';

		act(() => {
			renderEntityTraces({ expression });
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		const spec = capturedPayloads[0].compositeQuery.queries[0]?.spec as {
			filter?: { expression: string };
		};
		expect(spec.filter?.expression).toContain('k8s.pod.name');
		expect(spec.filter?.expression).toContain('service.name');
	});
});
