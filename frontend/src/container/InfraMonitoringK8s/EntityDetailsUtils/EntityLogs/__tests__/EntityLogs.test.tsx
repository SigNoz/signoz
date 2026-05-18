import { VirtuosoMockContext } from 'react-virtuoso';
import { mockQueryRangeV5WithLogsResponse } from '__tests__/query_range_v5.util';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import {
	act,
	fireEvent,
	render,
	RenderResult,
	screen,
	waitFor,
} from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import EntityLogs from '../EntityLogs';
import { K8S_ENTITY_LOGS_EXPRESSION_KEY } from '../hooks';

function verifyEntityLogsV5Request({
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
	expect(orderKeys).toContain('id');
}

jest.mock(
	'components/OverlayScrollbar/OverlayScrollbar',
	() =>
		function MockOverlayScrollbar({
			children,
		}: {
			children: React.ReactNode;
		}): JSX.Element {
			return <div>{children}</div>;
		},
);

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

describe('EntityLogs', () => {
	let capturedQueryRangePayloads: QueryRangePayloadV5[] = [];
	const itemHeight = 100;

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
	it('should check if k8s logs pagination flows work properly', async () => {
		let renderResult: RenderResult;
		let scrollableElement: HTMLElement;

		act(() => {
			renderResult = render(
				<NuqsTestingAdapter
					searchParams={`${K8S_ENTITY_LOGS_EXPRESSION_KEY}=k8s.pod.name+%3D+%22x%22`}
				>
					<VirtuosoMockContext.Provider value={{ viewportHeight: 500, itemHeight }}>
						<EntityLogs
							timeRange={{ startTime: 1, endTime: 2 }}
							isModalTimeSelection={false}
							handleTimeChange={jest.fn()}
							selectedInterval="5m"
							queryKey="test"
							category={InfraMonitoringEntity.PODS}
							initialExpression='k8s.pod.name = "x"'
						/>
					</VirtuosoMockContext.Provider>
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

		await waitFor(async () => {
			scrollableElement = renderResult.container.querySelector(
				'[data-test-id="virtuoso-scroller"]',
			) as HTMLElement;

			expect(scrollableElement).not.toBeNull();

			if (scrollableElement) {
				scrollableElement.scrollTop = 99 * itemHeight;

				act(() => {
					fireEvent.scroll(scrollableElement);
				});
			}
		});

		await waitFor(() => {
			expect(capturedQueryRangePayloads).toHaveLength(2);
		});

		const firstPayload = capturedQueryRangePayloads[0];
		verifyEntityLogsV5Request({
			payload: firstPayload,
			expectedOffset: 0,
		});

		const initialTimeRange = {
			start: firstPayload.start,
			end: firstPayload.end,
		};

		const secondPayload = capturedQueryRangePayloads[1];
		verifyEntityLogsV5Request({
			payload: secondPayload,
			expectedOffset: 100,
			initialTimeRange,
		});

		await waitFor(async () => {
			scrollableElement = renderResult.container.querySelector(
				'[data-test-id="virtuoso-scroller"]',
			) as HTMLElement;

			expect(scrollableElement).not.toBeNull();

			if (scrollableElement) {
				scrollableElement.scrollTop = 199 * itemHeight;

				act(() => {
					fireEvent.scroll(scrollableElement);
				});
			}
		});

		await waitFor(() => {
			expect(capturedQueryRangePayloads.length).toBeGreaterThanOrEqual(3);
		});

		const thirdPayload = capturedQueryRangePayloads[2];
		verifyEntityLogsV5Request({
			payload: thirdPayload,
			expectedOffset: 200,
			initialTimeRange,
		});
	});
});
