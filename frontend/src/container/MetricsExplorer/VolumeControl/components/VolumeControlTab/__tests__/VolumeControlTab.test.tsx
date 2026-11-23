import {
	useGetMetricReductionRuleStats,
	useListMetricReductionRules,
} from 'api/generated/services/metrics';
import {
	MetricreductionruletypesGettableReductionRuleDTO,
	MetricreductionruletypesMatchTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useVolumeControlFeatureGate } from 'hooks/metricsExplorer/useVolumeControlFeatureGate';
import { render, screen } from 'tests/test-utils';

import VolumeControlTab from '../VolumeControlTab';

jest.mock('api/generated/services/metrics', () => ({
	useListMetricReductionRules: jest.fn(),
	useGetMetricReductionRuleStats: jest.fn(),
}));
jest.mock('hooks/metricsExplorer/useVolumeControlFeatureGate', () => ({
	useVolumeControlFeatureGate: jest.fn(),
}));
jest.mock('../../VolumeControlChart/VolumeControlChart', () => ({
	__esModule: true,
	default: (): null => null,
}));

const RULE: MetricreductionruletypesGettableReductionRuleDTO = {
	active: true,
	id: 'rule-1',
	effectiveFrom: '2026-06-15T12:00:00Z',
	metricName: 'http.server.request.duration.bucket',
	matchType: MetricreductionruletypesMatchTypeDTO.drop,
	labels: ['http.user_agent'],
	ingestedSamples: 1000,
	ingestedSeries: 100,
	retainedSamples: 500,
	retainedSeries: 50,
};

describe('VolumeControlTab', () => {
	beforeEach(() => {
		jest.mocked(useVolumeControlFeatureGate).mockReturnValue({
			isVolumeControlEnabled: true,
			canManageVolumeControl: false,
			isLoading: false,
		});
		jest.mocked(useListMetricReductionRules).mockReturnValue({
			data: { status: 'success', data: { rules: [RULE], total: 1 } },
			isLoading: false,
			isError: false,
		} as ReturnType<typeof useListMetricReductionRules>);
		jest.mocked(useGetMetricReductionRuleStats).mockReturnValue({
			data: undefined,
			isLoading: false,
			isFetching: false,
			isError: false,
		} as ReturnType<typeof useGetMetricReductionRuleStats>);
	});

	it('keeps the metric name and the mode on one line', () => {
		render(<VolumeControlTab />);

		expect(
			screen.getByText(RULE.metricName).getAttribute('data-text-overflow'),
		).toBe('visible');
		expect(screen.getByText('Exclude').getAttribute('data-text-overflow')).toBe(
			'visible',
		);
	});
});
