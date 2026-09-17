import { SINGLE_FLIGHT_WAIT_TIME_MS } from 'lib/authz/hooks/useAuthZ/constants';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { billingSuccessResponse } from 'mocks-server/__mockdata__/billing';
import {
	licensesSuccessResponse,
	notOfTrailResponse,
	trialConvertedToSubscriptionResponse,
} from 'mocks-server/__mockdata__/licenses';
import { server } from 'mocks-server/server';
import { act, render, screen, getAppContextMock } from 'tests/test-utils';
import APIError from 'types/api/error';
import {
	LicensePlatform,
	LicenseResModel,
	LicenseState,
} from 'types/api/licensesV3/getActive';
import { getFormattedDate } from 'utils/timeUtils';

import BillingContainer from './BillingContainer';

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));

// The hook fetches the active license key on mount; stub it so the billing
// request is the only one this suite waits on.
vi.mock('hooks/useActiveLicenseKey/useActiveLicenseKey', () => ({
	__esModule: true,
	default: vi.fn(() => ({ licenseKey: 'test-key', isLoading: false })),
}));

describe('BillingContainer', () => {
	vi.setConfig({ testTimeout: 30000 });

	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(async () => {
		server.resetHandlers();
		// useAuthZ batches its checks behind a module-level single-flight window.
		// Draining it here stops the next test from joining the previous test's
		// batch and reading its grants.
		await new Promise((resolve) => {
			setTimeout(resolve, SINGLE_FLIGHT_WAIT_TIME_MS * 2);
		});
	});

	it('Component should render', async () => {
		render(<BillingContainer />);

		const dataInjection = await screen.findByRole('columnheader', {
			name: /data ingested/i,
		});
		expect(dataInjection).toBeInTheDocument();
		const pricePerUnit = await screen.findByRole('columnheader', {
			name: /price per unit/i,
		});
		expect(pricePerUnit).toBeInTheDocument();
		const cost = await screen.findByRole('columnheader', {
			name: /cost/i,
		});
		expect(cost).toBeInTheDocument();

		const dayRemainingInBillingPeriod = await screen.findByText(
			/Please upgrade plan now to retain your data./i,
			{},
			{ timeout: 5000 },
		);
		expect(dayRemainingInBillingPeriod).toBeInTheDocument();

		const upgradePlanButton = screen.getByTestId('upgrade-plan-button');
		expect(upgradePlanButton).toBeInTheDocument();

		const dollar = await screen.findByText(/\$1,278.3/i, {}, { timeout: 5000 });
		expect(dollar).toBeInTheDocument();

		const currentBill = await screen.findByText('billing');
		expect(currentBill).toBeInTheDocument();
	});

	describe('Trial scenarios', () => {
		beforeEach(() => {
			// Date only, no fake timers: `findBy*` polls on the real clock and would
			// never resolve against a frozen one.
			vi.setSystemTime(new Date('2023-10-20'));
		});

		it('OnTrail', async () => {
			// Pin "now" so trial end (20 Oct 2023) is tomorrow => "1 days_remaining"

			render(
				<BillingContainer />,
				{},
				{ appContextOverrides: { trialInfo: licensesSuccessResponse.data } },
			);

			await expect(screen.findByText('Free Trial')).resolves.toBeInTheDocument();
			await expect(screen.findByText('billing')).resolves.toBeInTheDocument();
			await expect(
				screen.findByText(/\$0/i, {}, { timeout: 5000 }),
			).resolves.toBeInTheDocument();

			await expect(
				screen.findByText(
					/You are in free trial period. Your free trial will end on 20 Oct 2023/i,
				),
			).resolves.toBeInTheDocument();

			await expect(
				screen.findByText(/1 days_remaining/i),
			).resolves.toBeInTheDocument();

			const upgradeButtons = await screen.findAllByRole('button', {
				name: /upgrade_plan/i,
			});
			expect(upgradeButtons).toHaveLength(2);
			expect(upgradeButtons[1]).toBeInTheDocument();

			await expect(
				screen.findByText(/checkout_plans/i),
			).resolves.toBeInTheDocument();
			await expect(
				screen.findByRole('link', { name: /here/i }),
			).resolves.toBeInTheDocument();

			await expect(
				screen.findByText('Cancel your subscription', { selector: 'span' }),
			).resolves.toBeInTheDocument();
		});

		it('OnTrail but trialConvertedToSubscription', async () => {
			await act(async () => {
				render(
					<BillingContainer />,
					{},
					{
						appContextOverrides: {
							trialInfo: trialConvertedToSubscriptionResponse.data,
						},
					},
				);
			});

			const currentBill = await screen.findByText('billing');
			expect(currentBill).toBeInTheDocument();

			const dollar0 = await screen.findByText(/\$0/i, {}, { timeout: 5000 });
			expect(dollar0).toBeInTheDocument();

			const onTrail = await screen.findByText(
				/You are in free trial period. Your free trial will end on 20 Oct 2023/i,
			);
			expect(onTrail).toBeInTheDocument();

			const receivedCardDetails = await screen.findByText(
				/card_details_recieved_and_billing_info/i,
			);
			expect(receivedCardDetails).toBeInTheDocument();

			const manageBillingButton = await screen.findByRole('button', {
				name: /manage_billing/i,
			});
			expect(manageBillingButton).toBeInTheDocument();

			const dayRemainingInBillingPeriod =
				await screen.findByText(/1 days_remaining/i);
			expect(dayRemainingInBillingPeriod).toBeInTheDocument();

			await expect(
				screen.findByText('Cancel your subscription', { selector: 'span' }),
			).resolves.toBeInTheDocument();
		});
	});

	describe('CancelSubscriptionBanner visibility', () => {
		const baseActiveLicense = getAppContextMock('ADMIN')
			.activeLicense as LicenseResModel;

		it('should render when license is ACTIVATED and platform is CLOUD', async () => {
			render(<BillingContainer />);
			await expect(
				screen.findByText('Cancel your subscription', { selector: 'span' }),
			).resolves.toBeInTheDocument();
		});

		it.each([
			['EXPIRED', LicenseState.EXPIRED],
			['TERMINATED', LicenseState.TERMINATED],
			['CANCELLED', LicenseState.CANCELLED],
			['EVALUATION_EXPIRED', LicenseState.EVALUATION_EXPIRED],
			['DEFAULTED', LicenseState.DEFAULTED],
			['ISSUED', LicenseState.ISSUED],
			['EVALUATING', LicenseState.EVALUATING],
		])('should not render when license state is %s', async (_, state) => {
			render(
				<BillingContainer />,
				{},
				{
					appContextOverrides: {
						activeLicense: { ...baseActiveLicense, state },
					},
				},
			);
			await screen.findByText('billing');
			expect(
				screen.queryByText('Cancel your subscription', { selector: 'span' }),
			).not.toBeInTheDocument();
		});

		const makeAPIError = (statusCode: number): APIError =>
			new APIError({
				httpStatusCode: statusCode as any,
				error: { code: 'error', message: 'error', url: '', errors: [] },
			});

		it.each([
			[
				'Self-Hosted platform',
				{
					activeLicense: {
						...baseActiveLicense,
						platform: LicensePlatform.SELF_HOSTED,
					},
					activeLicenseFetchError: null,
				},
			],
			[
				'Community Enterprise user (license API 404)',
				{
					activeLicense: null,
					activeLicenseFetchError: makeAPIError(404),
				},
			],
			[
				'Community user (license API 501)',
				{
					activeLicense: null,
					activeLicenseFetchError: makeAPIError(501),
				},
			],
		])('should not render for %s', async (_, overrides) => {
			render(<BillingContainer />, {}, { appContextOverrides: overrides });
			await screen.findByText('billing');
			expect(
				screen.queryByText('Cancel your subscription', { selector: 'span' }),
			).not.toBeInTheDocument();
		});
	});

	it('Not on ontrail', async () => {
		const { findByText } = render(
			<BillingContainer />,
			{},
			{
				appContextOverrides: {
					trialInfo: notOfTrailResponse.data,
				},
			},
		);

		const billingPeriodText = `Your current billing period is from ${getFormattedDate(
			billingSuccessResponse.data.billingPeriodStart,
		)} to ${getFormattedDate(billingSuccessResponse.data.billingPeriodEnd)}`;

		const billingPeriod = await findByText(
			billingPeriodText,
			{},
			{ timeout: 5000 },
		);
		expect(billingPeriod).toBeInTheDocument();

		const currentBill = await screen.findByText('billing');
		expect(currentBill).toBeInTheDocument();

		const dollar0 = await screen.findByText(/\$1,278.3/i);
		expect(dollar0).toBeInTheDocument();

		const metricsRow = await screen.findByRole('row', {
			name: /metrics 4012 Million 0.1 \$ 401.2/i,
		});
		expect(metricsRow).toBeInTheDocument();

		const logRow = await screen.findByRole('row', {
			name: /Logs 497 GB 0.4 \$ 198.8/i,
		});
		expect(logRow).toBeInTheDocument();
	});
});
