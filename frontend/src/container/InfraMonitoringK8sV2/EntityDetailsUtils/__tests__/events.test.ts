import logEvent from 'api/common/logEvent';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';

import { logInfraDrawerFilterCustomizedEvent } from '../events';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(() => Promise.resolve()),
}));

describe('logInfraDrawerFilterCustomizedEvent', () => {
	it('logs a cleared filter with no expression keys', () => {
		logInfraDrawerFilterCustomizedEvent(
			InfraMonitoringEntity.PODS,
			'logs',
			'',
			'search',
		);

		expect(jest.mocked(logEvent)).toHaveBeenCalledWith(
			'Infra Monitoring: Drawer filter customized',
			{
				entityType: InfraMonitoringEntity.PODS,
				tab: 'logs',
				expressionKeys: [],
				filterSource: 'search',
			},
		);
	});
});
