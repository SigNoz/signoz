import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import overview from '../../../../../pkg/modules/dashboard/impldashboard/fs/definitions/services-overview.json';
import { withApdexThreshold } from '../apdexThreshold';

const dashboard = {
	id: 'services-overview',
	...overview.definition,
} as unknown as DashboardtypesGettableDashboardV2DTO;

function apdexThresholds(d: DashboardtypesGettableDashboardV2DTO): number[] {
	return (JSON.stringify(d).match(/"threshold":\d+(\.\d+)?/g) ?? []).map(
		(match) => Number(match.split(':')[1]),
	);
}

describe('withApdexThreshold', () => {
	it('moves T and 4T to the service threshold', () => {
		expect(apdexThresholds(withApdexThreshold(dashboard, 0.8))).toStrictEqual([
			800, 3200,
		]);
	});

	it('leaves a dashboard at the default threshold untouched', () => {
		expect(withApdexThreshold(dashboard, 0.5)).toBe(dashboard);
	});
});
