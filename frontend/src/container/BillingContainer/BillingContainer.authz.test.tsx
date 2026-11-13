import {
	SubscriptionCreatePermission,
	SubscriptionReadPermission,
	SubscriptionUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/subscription.permissions';
import {
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { billingSuccessResponse } from 'mocks-server/__mockdata__/billing';
import { trialConvertedToSubscriptionResponse } from 'mocks-server/__mockdata__/licenses';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, waitFor } from 'tests/test-utils';

import BillingContainer from './BillingContainer';

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

const pastDueSubscription = rest.get(
	'http://localhost/api/v1/subscriptions',
	(_, res, ctx) =>
		res(
			ctx.status(200),
			ctx.json({
				...billingSuccessResponse,
				data: { ...billingSuccessResponse.data, subscriptionStatus: 'past_due' },
			}),
		),
);

const renderConverted = (): void => {
	render(
		<BillingContainer />,
		{},
		{
			appContextOverrides: {
				trialInfo: trialConvertedToSubscriptionResponse.data,
			},
		},
	);
};

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
			expect(screen.getByTestId('header-billing-button')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
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
			expect(screen.getByTestId('header-billing-button')).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});
		expect(screen.getByTestId('upgrade-plan-button')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
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
			expect(screen.getByTestId('header-billing-button')).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});
		expect(screen.queryByTestId('upgrade-plan-button')).not.toBeInTheDocument();
	});

	it('disables manage billing when subscription list is denied', async () => {
		server.use(
			setupAuthzAllow(
				SubscriptionReadPermission,
				SubscriptionCreatePermission,
				SubscriptionUpdatePermission,
			),
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
			expect(screen.getByTestId('header-billing-button')).toHaveAttribute(
				'aria-disabled',
				'true',
			);
		});
	});

	it('lets a past-due workspace open the portal from the callout', async () => {
		server.use(setupAuthzAdmin(), pastDueSubscription);

		renderConverted();

		const action = await screen.findByRole('button', { name: 'here' });
		expect(action).toHaveAttribute('data-slot', 'callout-link');
		await waitFor(() => {
			expect(action).toBeEnabled();
		});
	});

	it('disables the past-due callout action when subscription update is denied', async () => {
		server.use(
			setupAuthzAllow(SubscriptionReadPermission, SubscriptionCreatePermission),
			pastDueSubscription,
		);

		renderConverted();

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'here' })).toBeDisabled();
		});
	});
});
