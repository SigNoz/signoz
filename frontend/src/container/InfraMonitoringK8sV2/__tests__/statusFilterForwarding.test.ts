import * as inframonitoring from 'api/generated/services/inframonitoring';

import { entityRegistry } from '../Base/entity.registry';
import { K8sCategories } from '../constants';

jest.mock('api/generated/services/inframonitoring');

/**
 * Every list the status filter offers must forward the flag, or the control is a
 * no-op on that section. Mirrors the filter structs in pkg/types/inframonitoringtypes.
 */
const EXPECTED_FLAGS: Record<string, string[]> = {
	[K8sCategories.PODS]: ['filterByPodStatus'],
	[K8sCategories.CONTAINERS]: ['filterByContainerStatus'],
	[K8sCategories.NODES]: ['filterByPodStatus', 'filterByNodeReadiness'],
	[K8sCategories.CLUSTERS]: ['filterByPodStatus', 'filterByNodeReadiness'],
	[K8sCategories.NAMESPACES]: ['filterByPodStatus'],
	[K8sCategories.DEPLOYMENTS]: ['filterByPodStatus'],
	[K8sCategories.DAEMONSETS]: ['filterByPodStatus'],
	[K8sCategories.STATEFULSETS]: ['filterByPodStatus'],
	[K8sCategories.JOBS]: ['filterByPodStatus'],
};

const SENTINELS: Record<string, string[]> = {
	filterByPodStatus: ['crashloopbackoff'],
	filterByNodeReadiness: ['not_ready'],
	filterByContainerStatus: ['oomkilled'],
};

describe('status filters reach the list APIs', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		Object.values(inframonitoring).forEach((exported) => {
			if (jest.isMockFunction(exported)) {
				exported.mockResolvedValue({
					data: { type: 'list', records: [], total: 0 },
				});
			}
		});
	});

	Object.entries(EXPECTED_FLAGS).forEach(([category, flags]) => {
		it(`forwards ${flags.join(' + ')} for ${category}`, async () => {
			const config = entityRegistry[category];
			expect(config).toBeDefined();

			await config.list.fetchListData({
				filter: {
					expression: '',
					...Object.fromEntries(flags.map((flag) => [flag, SENTINELS[flag]])),
				},
				start: 1,
				end: 2,
				limit: 10,
				offset: 0,
			});

			const call = Object.values(inframonitoring)
				.filter(jest.isMockFunction)
				.flatMap((fn) => (fn as jest.Mock).mock.calls)[0];

			expect(call).toBeDefined();
			flags.forEach((flag) => {
				expect(call[0].filter[flag]).toStrictEqual(SENTINELS[flag]);
			});
		});
	});
});
