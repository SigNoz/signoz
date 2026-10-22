import { mockFieldsAPIsWithEmptyResponse } from '__tests__/fields_api.util';
import { mockQueryRangeV5WithTracesResponse } from '__tests__/query_range_v5.util';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import {
	createCustomTimeRange,
	createGlobalTimeStore,
	GlobalTimeContext,
	NANO_SECOND_MULTIPLIER,
} from 'store/globalTime';
import { act, render, waitFor } from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import EntityTraces from '../EntityTraces';
import { K8S_ENTITY_TRACES_EXPRESSION_KEY } from '../hooks';

jest.mock('../../EntityDateTimeSelector/EntityDateTimeSelector', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="mock-datetime-selection">Date Time</div>
	),
}));

const START_MS = 1705315200000; // 2024-01-15T10:40:00Z
const END_MS = 1705318800000; // 2024-01-15T11:40:00Z

describe('EntityTraces time range wiring', () => {
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
		mockFieldsAPIsWithEmptyResponse();
	});

	it('should query the V5 API with the global time range converted to milliseconds', async () => {
		const store = createGlobalTimeStore();
		store
			.getState()
			.setSelectedTime(
				createCustomTimeRange(
					START_MS * NANO_SECOND_MULTIPLIER,
					END_MS * NANO_SECOND_MULTIPLIER,
				),
			);

		const expression = 'k8s.pod.name = "test-pod"';

		act(() => {
			render(
				<GlobalTimeContext.Provider value={store}>
					<NuqsTestingAdapter
						searchParams={`${K8S_ENTITY_TRACES_EXPRESSION_KEY}=${encodeURIComponent(
							expression,
						)}`}
					>
						<EntityTraces
							eventEntity="test"
							queryKey="test"
							category={InfraMonitoringEntity.PODS}
							initialExpression={expression}
						/>
					</NuqsTestingAdapter>
				</GlobalTimeContext.Provider>,
			);
		});

		await waitFor(() => {
			expect(capturedPayloads).toHaveLength(1);
		});

		expect(capturedPayloads[0].start).toBe(START_MS);
		expect(capturedPayloads[0].end).toBe(END_MS);
	});
});
