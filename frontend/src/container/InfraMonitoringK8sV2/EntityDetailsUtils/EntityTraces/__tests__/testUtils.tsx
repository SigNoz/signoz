import { mockFieldsAPIsWithEmptyResponse } from '__tests__/fields_api.util';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { render, RenderResult } from 'tests/test-utils';
import { QueryRangePayloadV5 } from 'types/api/v5/queryRange';

import EntityTraces from '../EntityTraces';
import { K8S_ENTITY_TRACES_EXPRESSION_KEY } from '../hooks';

beforeEach(() => {
	mockFieldsAPIsWithEmptyResponse();
});

export interface RenderEntityTracesOptions {
	expression?: string;
	category?: InfraMonitoringEntity;
	pagination?: { offset: number; limit: number };
}

export function renderEntityTraces({
	expression = 'k8s.pod.name = "test-pod"',
	category = InfraMonitoringEntity.PODS,
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
				eventEntity="test"
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

jest.mock('../../EntityDateTimeSelector/EntityDateTimeSelector', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="mock-datetime-selection">Date Time</div>
	),
}));

jest.mock('../../EntityDateTimeSelector/useEntityDetailsTime', () => ({
	useEntityDetailsTime: (): {
		timeRange: { startTime: number; endTime: number };
		selectedInterval: string;
		handleTimeChange: jest.Mock;
	} => ({
		timeRange: { startTime: 1, endTime: 2 },
		selectedInterval: '5m',
		handleTimeChange: jest.fn(),
	}),
}));
