import { billingSuccessResponse } from 'mocks-server/__mockdata__/billing';
import {
	licensesSuccessResponse,
	notOfTrailResponse,
	trialConvertedToSubscriptionResponse,
} from 'mocks-server/__mockdata__/licenses';
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
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

describe('BillingContainer', () => {
	jest.setTimeout(30000);

	it('Component should render', async () => {
		render(<BillingContainer />);

		const dataInjection = screen.getByRole('columnheader', {
			name: /data ingested/i,
		});
		expect(dataInjection).toBeInTheDocument();
		const pricePerUnit = screen.getByRole('columnheader', {
			name: /price per unit/i,
		});
		expect(pricePerUnit).toBeInTheDocument();
		const cost = await screen.findByRole('columnheader', {
			name: /cost \(billing period to date\)/i,
		});
		expect(cost).toBeInTheDocument();

		const dayRemainingInBillingPeriod = await screen.findByText(
			/Please upgrade plan now to retain your data./i,
		);
		expect(dayRemainingInBillingPeriod).toBeInTheDocument();

		const upgradePlanButton = screen.getByTestId('upgrade-plan-button');
		expect(upgradePlanButton).toBeInTheDocument();

		const dollar = await screen.findByText(/\$1,278.3/i);
		expect(dollar).toBeInTheDocument();

		const currentBill = await screen.findByText('billing');
		expect(currentBill).toBeInTheDocument();
	});

	describe('Trial scenarios', () => {
		beforeEach(() => {
			jest.useFakeTimers();
			jest.setSystemTime(new Date('2023-10-20'));
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('OnTrail', async () => {
			// Pin "now" so trial end (20 Oct 2023) is tomorrow => "1 days_remaining"

			render(
				<BillingContainer />,
				{},
				{ appContextOverrides: { trialInfo: licensesSuccessResponse.data } },
			);

			// If the component schedules any setTimeout on mount, flush them:
			jest.runOnlyPendingTimers();

			await expect(screen.findByText('Free Trial')).resolves.toBeInTheDocument();
			await expect(screen.findByText('billing')).resolves.toBeInTheDocument();
			await expect(screen.findByText(/\$0/i)).resolves.toBeInTheDocument();

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

			const dollar0 = await screen.findByText(/\$0/i);
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

		const billingPeriod = await findByText(billingPeriodText);
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
