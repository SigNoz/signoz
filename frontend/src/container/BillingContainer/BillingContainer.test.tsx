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
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

describe('BillingContainer', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('Component should render', async () => {
		render(<BillingContainer />);

		const dayRemainingInBillingPeriod = await screen.findByText(
			/Please upgrade plan now to retain your data./i,
		);
		expect(dayRemainingInBillingPeriod).toBeInTheDocument();

		expect(
			screen.getByText('Data Ingested', { selector: 'th' }),
		).toBeInTheDocument();
		expect(
			screen.getByText('Price per Unit', { selector: 'th' }),
		).toBeInTheDocument();
		expect(screen.getByText('Cost', { selector: 'th' })).toBeInTheDocument();

		const upgradePlanButton = screen.getByTestId('upgrade-plan-button');
		expect(upgradePlanButton).toBeInTheDocument();

		expect(screen.getByText(/\$1,278.3/i)).toBeInTheDocument();
		expect(screen.getByText('billing')).toBeInTheDocument();
	});

	describe('Trial scenarios', () => {
		beforeEach(() => {
			jest.useFakeTimers({
				now: new Date('2023-10-20'),
				doNotFake: [
					'hrtime',
					'nextTick',
					'performance',
					'queueMicrotask',
					'requestAnimationFrame',
					'cancelAnimationFrame',
					'requestIdleCallback',
					'cancelIdleCallback',
					'setImmediate',
					'clearImmediate',
					'setInterval',
					'clearInterval',
					'setTimeout',
					'clearTimeout',
				],
			});
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

			expect(screen.getByTestId('header-billing-button')).toHaveTextContent(
				'upgrade_plan',
			);
			expect(screen.getByTestId('upgrade-plan-button')).toHaveTextContent(
				'upgrade_plan',
			);

			await expect(
				screen.findByText(/checkout_plans/i),
			).resolves.toBeInTheDocument();
			expect(screen.getByText('here', { selector: 'a' })).toHaveAttribute(
				'href',
				'https://signoz.io/pricing/',
			);

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

			expect(screen.getByTestId('header-billing-button')).toHaveTextContent(
				'manage_billing',
			);

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

		expect(screen.getByText('billing')).toBeInTheDocument();
		expect(screen.getByText(/\$1,278.3/i)).toBeInTheDocument();

		const cellTexts = (rowName: string): string[] =>
			Array.from(
				screen
					.getByText(rowName, { selector: 'td > div' })
					.closest('tr')
					?.querySelectorAll('td') ?? [],
			).map((cell) => cell.textContent ?? '');

		expect(cellTexts('Metrics')).toStrictEqual([
			'Metrics',
			'4012 Million',
			'0.1',
			'$ 401.2',
		]);
		expect(cellTexts('Logs')).toStrictEqual(['Logs', '497 GB', '0.4', '$ 198.8']);
	});
});
