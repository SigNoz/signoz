import {
	SubscriptionCreatePermission,
	SubscriptionReadPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/subscription.permissions';
import {
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { trialConvertedToSubscriptionResponse } from 'mocks-server/__mockdata__/licenses';
import { server } from 'mocks-server/server';
import { render, screen, waitFor } from 'tests/test-utils';

import BillingContainer from './BillingContainer';

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

describe('BillingContainer - AuthZ', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('renders usage and enables actions when all subscription permissions are granted', async () => {
		server.use(setupAuthzAdmin());

		render(<BillingContainer />);

		await expect(
			screen.findByRole('columnheader', { name: /data ingested/i }),
		).resolves.toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByTestId('header-billing-button')).toBeEnabled();
		});
		expect(screen.queryByText(/not authorized/i)).not.toBeInTheDocument();
	});

	it('blocks the usage section when subscription read is denied', async () => {
		server.use(setupAuthzDeny(SubscriptionReadPermission));

		render(<BillingContainer />);

		await expect(
			screen.findByText(/not authorized/i),
		).resolves.toBeInTheDocument();
		expect(screen.getByTestId('header-billing-button')).toBeInTheDocument();
		expect(
			screen.queryByRole('columnheader', { name: /data ingested/i }),
		).not.toBeInTheDocument();
	});

	it('disables upgrade when subscription create is denied', async () => {
		server.use(setupAuthzAllow(SubscriptionReadPermission));

		render(<BillingContainer />);

		await waitFor(() => {
			expect(screen.getByTestId('header-billing-button')).toBeDisabled();
		});
		expect(screen.getByTestId('upgrade-plan-button')).toBeDisabled();
	});

	it('disables manage billing when subscription update is denied', async () => {
		server.use(
			setupAuthzAllow(SubscriptionReadPermission, SubscriptionCreatePermission),
		);

		render(
			<BillingContainer />,
			{},
			{
				appContextOverrides: {
					trialInfo: trialConvertedToSubscriptionResponse.data,
				},
			},
		);

		await waitFor(() => {
			expect(screen.getByTestId('header-billing-button')).toBeDisabled();
		});
		expect(screen.queryByTestId('upgrade-plan-button')).not.toBeInTheDocument();
	});
});
