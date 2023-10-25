import { billingSuccessResponse } from 'mocks-server/__mockdata__/billing';
import {
	notOfTrailResponse,
	trialConvertedToSubscriptionResponse,
} from 'mocks-server/__mockdata__/licenses';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { act, render, screen } from 'tests/test-utils';
import { getFormattedDate } from 'utils/timeUtils';

import BillingContainer from './BillingContainer';

const lisenceUrl = 'http://localhost/api/v2/licenses';

describe('BillingContainer', () => {
	test('Component should render', async () => {
		act(() => {
			render(<BillingContainer />);
		});
		const unit = screen.getAllByText(/unit/i);
		expect(unit[1]).toBeInTheDocument();
		const dataInjection = screen.getByRole('columnheader', {
			name: /data ingested/i,
		});
		expect(dataInjection).toBeInTheDocument();
		const pricePerUnit = screen.getByRole('columnheader', {
			name: /price per unit/i,
		});
		expect(pricePerUnit).toBeInTheDocument();
		const cost = screen.getByRole('columnheader', {
			name: /cost \(billing period to date\)/i,
		});
		expect(cost).toBeInTheDocument();

		const total = screen.getByRole('cell', {
			name: /total/i,
		});
		expect(total).toBeInTheDocument();

		const manageBilling = screen.getByRole('button', {
			name: /manage billing/i,
		});
		expect(manageBilling).toBeInTheDocument();

		const dollar = screen.getByRole('cell', {
			name: /\$0/i,
		});
		expect(dollar).toBeInTheDocument();

		const currentBill = screen.getByRole('heading', {
			name: /current bill total/i,
		});
		expect(currentBill).toBeInTheDocument();
	});

	test('OnTrail', async () => {
		act(() => {
			render(<BillingContainer />);
		});

		const freeTrailText = await screen.findByText('Free Trial');
		expect(freeTrailText).toBeInTheDocument();

		const currentBill = await screen.findByRole('heading', {
			name: /current bill total/i,
		});
		expect(currentBill).toBeInTheDocument();

		const dollar0 = await screen.findByText(/\$0/i);
		expect(dollar0).toBeInTheDocument();
		const onTrail = await screen.findByText(
			/You are in free trial period. Your free trial will end on 20 Oct 2023/i,
		);
		expect(onTrail).toBeInTheDocument();

		const numberOfDayRemaining = await screen.findByText(
			/1 days remaining in your billing period./i,
		);
		expect(numberOfDayRemaining).toBeInTheDocument();
		const upgradeButton = await screen.findAllByRole('button', {
			name: /upgrade/i,
		});
		expect(upgradeButton[1]).toBeInTheDocument();
		expect(upgradeButton.length).toBe(2);
		const checkPaidPlan = await screen.findByText(
			/Check out features in paid plans/i,
		);
		expect(checkPaidPlan).toBeInTheDocument();

		const link = screen.getByRole('link', { name: /here/i });
		expect(link).toBeInTheDocument();
	});

	test('OnTrail but trialConvertedToSubscription', async () => {
		server.use(
			rest.get(lisenceUrl, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(trialConvertedToSubscriptionResponse)),
			),
		);

		act(() => {
			render(<BillingContainer />);
		});

		const currentBill = await screen.findByRole('heading', {
			name: /current bill total/i,
		});
		expect(currentBill).toBeInTheDocument();

		const dollar0 = await screen.findByText(/\$0/i);
		expect(dollar0).toBeInTheDocument();

		const onTrail = await screen.findByText(
			/You are in free trial period. Your free trial will end on 20 Oct 2023/i,
		);
		expect(onTrail).toBeInTheDocument();

		const receivedCardDetails = await screen.findByText(
			/We have received your card details, your billing will only start after the end of your free trial period./i,
		);
		expect(receivedCardDetails).toBeInTheDocument();

		const manageBillingButton = await screen.findByRole('button', {
			name: /manage billing/i,
		});
		expect(manageBillingButton).toBeInTheDocument();

		const dayRemainingInBillingPeriod = await screen.findByText(
			/1 days remaining in your billing period./i,
		);
		expect(dayRemainingInBillingPeriod).toBeInTheDocument();
	});

	test('Not on ontrail', async () => {
		server.use(
			rest.get(lisenceUrl, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(notOfTrailResponse)),
			),
		);
		render(<BillingContainer />);

		const billingPeriodText = `Your current billing period is from ${getFormattedDate(
			billingSuccessResponse.data.billingPeriodStart,
		)} to ${getFormattedDate(billingSuccessResponse.data.billingPeriodEnd)}`;

		const billingPeriod = await screen.findByRole('heading', {
			name: new RegExp(billingPeriodText, 'i'),
		});
		expect(billingPeriod).toBeInTheDocument();

		const currentBill = await screen.findByRole('heading', {
			name: /current bill total/i,
		});
		expect(currentBill).toBeInTheDocument();

		const dollar0 = await screen.findAllByText(/\$1278.3/i);
		expect(dollar0[0]).toBeInTheDocument();
		expect(dollar0.length).toBe(2);

		const metricsRow = await screen.findByRole('row', {
			name: /metrics Million 4012 0.1 \$ 401.2/i,
		});
		expect(metricsRow).toBeInTheDocument();

		const logRow = await screen.findByRole('row', {
			name: /Logs GB 497 0.4 \$ 198.8/i,
		});
		expect(logRow).toBeInTheDocument();

		const totalBill = await screen.findByRole('cell', {
			name: /\$1278/i,
		});
		expect(totalBill).toBeInTheDocument();

		const totalBillRow = await screen.findByRole('row', {
			name: /total \$1278/i,
		});
		expect(totalBillRow).toBeInTheDocument();
	});

	test('Should render corrent day remaining in billing period', async () => {
		server.use(
			rest.get(lisenceUrl, (req, res, ctx) =>
				res(ctx.status(200), ctx.json(notOfTrailResponse)),
			),
		);
		render(<BillingContainer />);
		const dayRemainingInBillingPeriod = await screen.findByText(
			/11 days remaining in your billing period./i,
		);
		expect(dayRemainingInBillingPeriod).toBeInTheDocument();
	});
});
