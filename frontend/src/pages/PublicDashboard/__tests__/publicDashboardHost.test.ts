import { getPublicDashboardPanelQueryRangeV2 } from 'api/generated/services/dashboard';
import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas';
import { PublicDashboardSchema } from 'hooks/dashboard/useGetResolvedPublicDashboard';

import { createPublicDashboardHost } from '../publicDashboardHost';

jest.mock('api/generated/services/dashboard', () => ({
	getPublicDashboardPanelQueryRangeV2: jest.fn(),
}));

describe('createPublicDashboardHost', () => {
	it('runs a panel query on the public endpoint by key, sending only the window', async () => {
		const host = createPublicDashboardHost('pub-1', { timeRangeEnabled: true });
		const requestPayload = {
			start: 1000,
			end: 2000,
		} as Querybuildertypesv5QueryRangeRequestDTO;

		await host.queryRunner.run({ panelId: 'p1', requestPayload });

		expect(jest.mocked(getPublicDashboardPanelQueryRangeV2)).toHaveBeenCalledWith(
			{ id: 'pub-1', key: 'p1' },
			{ startTime: '1000', endTime: '2000' },
			undefined,
		);
	});

	it('fetches list panels unpaged, since the public endpoint has no paging', () => {
		const host = createPublicDashboardHost('pub-1', { timeRangeEnabled: true });

		expect(host.queryRunner.paginates).toBe(false);
	});

	it('mounts nothing for a dashboard that predates the v2 schema', () => {
		const host = createPublicDashboardHost('pub-1', { timeRangeEnabled: true });

		expect(host.select({ schema: PublicDashboardSchema.Legacy })).toBeUndefined();
	});
});
