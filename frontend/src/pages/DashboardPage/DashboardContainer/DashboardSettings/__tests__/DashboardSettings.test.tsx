import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';

import { useDashboardStore } from '../../store/useDashboardStore';
import DashboardSettings from '../index';

const dashboard = {
	id: 'dash-1',
	spec: { display: { name: 'D' }, panels: {}, layouts: [], variables: [] },
} as unknown as DashboardtypesGettableDashboardV2DTO;

jest.mock('hooks/useGetTenantLicense', () => ({
	useGetTenantLicense: (): unknown => ({
		isCloudUser: true,
		isEnterpriseSelfHostedUser: false,
	}),
}));

jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEditContext',
	() => ({
		useDashboardEditContext: (): unknown => ({
			isEditable: true,
			editChecks: [],
			areOtherPermissionsLoading: false,
			deleteChecks: [],
			isLocked: false,
			canEditDashboard: true,
			canDeleteDashboard: true,
			editDisabledTooltip: '',
			deleteDisabledTooltip: '',
		}),
	}),
);

describe('DashboardSettings initial tab', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		useDashboardStore.getState().clearSettingsRequest();
		server.resetHandlers();
	});

	it('opens on Overview without a settings request', async () => {
		render(<DashboardSettings dashboard={dashboard} />);

		await expect(
			screen.findByRole('tab', { name: /Overview/ }),
		).resolves.toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: /Variables/ })).toHaveAttribute(
			'aria-selected',
			'false',
		);
	});

	it.each(['Variables', 'Publish'] as const)(
		'opens on the %s tab a settings request names',
		async (tab) => {
			useDashboardStore.getState().requestSettings({ tab });

			render(<DashboardSettings dashboard={dashboard} />);

			await expect(
				screen.findByRole('tab', { name: new RegExp(tab) }),
			).resolves.toHaveAttribute('aria-selected', 'true');
			expect(screen.getByRole('tab', { name: /Overview/ })).toHaveAttribute(
				'aria-selected',
				'false',
			);
		},
	);
});
