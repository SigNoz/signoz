import { ENVIRONMENT } from 'constants/env';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, RenderResult } from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import EntityTraces from '../EntityTraces';
import { K8S_ENTITY_TRACES_EXPRESSION_KEY } from '../hooks';

// QuerySearch fires autocomplete requests on mount; without handlers MSW
// passes them through to the real network and the resulting AxiosError fails
// whichever test happens to be running.
beforeEach(() => {
	server.use(
		rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/keys`, (_, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({ status: 'success', data: { keys: {}, complete: true } }),
			),
		),
		rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/values`, (_, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({ status: 'success', data: { values: {}, complete: true } }),
			),
		),
	);
});

export interface RenderEntityTracesOptions {
	expression?: string;
	timeRange?: { startTime: number; endTime: number };
	category?: InfraMonitoringEntity;
	selectedInterval?: '5m' | '15m' | '30m' | '1h';
	pagination?: { offset: number; limit: number };
}

export function renderEntityTraces({
	expression = 'k8s.pod.name = "test-pod"',
	timeRange = { startTime: 1, endTime: 2 },
	category = InfraMonitoringEntity.PODS,
	selectedInterval = '5m',
	pagination,
}: RenderEntityTracesOptions = {}): RenderResult {
	const encodedExpression = encodeURIComponent(expression);
	let searchParams = `${K8S_ENTITY_TRACES_EXPRESSION_KEY}=${encodedExpression}`;

	if (pagination) {
		const paginationStr = encodeURIComponent(JSON.stringify(pagination));
		searchParams += `&pagination=${paginationStr}`;
	}

	return render(
		<NuqsTestingAdapter searchParams={searchParams}>
			<EntityTraces
				timeRange={timeRange}
				isModalTimeSelection={false}
				handleTimeChange={jest.fn()}
				selectedInterval={selectedInterval}
				queryKey="test"
				category={category}
				initialExpression={expression}
			/>
		</NuqsTestingAdapter>,
	);
}

export function verifyQueryPayload({
	payload,
	expectedOffset,
	expectedLimit,
	expectedTimeRange,
}: {
	payload: QueryRangePayloadV5;
	expectedOffset?: number;
	expectedLimit?: number;
	expectedTimeRange?: { start: number; end: number };
}): void {
	const spec = payload.compositeQuery.queries[0]?.spec as {
		offset?: number;
		limit?: number;
		order?: Array<{ key: { name: string }; direction: string }>;
	};

	if (expectedOffset !== undefined) {
		expect(spec.offset).toBe(expectedOffset);
	}

	if (expectedLimit !== undefined) {
		expect(spec.limit).toBe(expectedLimit);
	}

	if (expectedTimeRange) {
		expect(payload.start).toBe(expectedTimeRange.start);
		expect(payload.end).toBe(expectedTimeRange.end);
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
