import { mockQueryRangeV5WithLogsResponse } from '__tests__/query_range_v5.util';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { act, render, screen, waitFor } from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import EntityTraces from '../EntityTraces';
import { K8S_ENTITY_TRACES_EXPRESSION_KEY } from '../hooks';

function verifyEntityTracesV5Request({
	payload,
	expectedOffset,
	initialTimeRange,
}: {
	payload: QueryRangePayloadV5;
	expectedOffset: number;
	initialTimeRange?: { start: number; end: number };
}): void {
	const spec = payload.compositeQuery.queries[0]?.spec as {
		offset?: number;
		order?: Array<{ key: { name: string }; direction: string }>;
	};
	expect(spec.offset).toBe(expectedOffset);
	if (initialTimeRange) {
		expect(payload.start).toBe(initialTimeRange.start);
		expect(payload.end).toBe(initialTimeRange.end);
	}
	const orderKeys = spec.order?.map((o) => o.key.name) ?? [];
	expect(orderKeys).toContain('timestamp');
}

jest.mock('container/TopNav/DateTimeSelectionV2/index.tsx', () => ({
	__esModule: true,
	default: ({
		onTimeChange,
	}: {
		onTimeChange?: (interval: string, dateTimeRange?: [number, number]) => void;
	}): JSX.Element => (
		<button
			type="button"
			data-testid="mock-datetime-selection"
			onClick={(): void => {
				onTimeChange?.('5m');
			}}
		>
			Select Time
		</button>
	),
}));

describe('EntityTraces', () => {
	let capturedQueryRangePayloads: QueryRangePayloadV5[] = [];

	beforeEach(() => {
		capturedQueryRangePayloads = [];
		mockQueryRangeV5WithLogsResponse({
			onReceiveRequest: async (req) => {
				const body = (await req.json()) as QueryRangePayloadV5;
				capturedQueryRangePayloads.push(body);
				return {};
			},
		});
	});

	it('should use V5 API for fetching traces', async () => {
		act(() => {
			render(
				<NuqsTestingAdapter
					searchParams={`${K8S_ENTITY_TRACES_EXPRESSION_KEY}=k8s.pod.name+%3D+%22x%22`}
				>
					<EntityTraces
						timeRange={{ startTime: 1, endTime: 2 }}
						isModalTimeSelection={false}
						handleTimeChange={jest.fn()}
						selectedInterval="5m"
						queryKey="test"
						category={InfraMonitoringEntity.PODS}
						initialExpression='k8s.pod.name = "x"'
					/>
				</NuqsTestingAdapter>,
			);
		});

		await waitFor(() => {
			expect(
				screen.queryByText('pending_data_placeholder'),
			).not.toBeInTheDocument();
		});

		await waitFor(() => {
			expect(capturedQueryRangePayloads).toHaveLength(1);
		});

		const firstPayload = capturedQueryRangePayloads[0];
		verifyEntityTracesV5Request({
			payload: firstPayload,
			expectedOffset: 0,
		});
	});
});
