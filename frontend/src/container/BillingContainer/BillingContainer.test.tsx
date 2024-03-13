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

jest.mock('uPlot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};

	const uPlotMock = jest.fn(() => ({
		paths,
	}));

	return {
		paths,
		default: uPlotMock,
	};
});

window.ResizeObserver =
	window.ResizeObserver ||
	jest.fn().mockImplementation(() => ({
		disconnect: jest.fn(),
		observe: jest.fn(),
		unobserve: jest.fn(),
	}));

describe('BillingContainer', () => {
	test('Component should render', async () => {
		act(() => {
			render(<BillingContainer />);
		});

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

		const manageBilling = screen.getByRole('button', {
			name: /manage billing/i,
		});
		expect(manageBilling).toBeInTheDocument();

		const dollar = screen.getByText(/\$0/i);
		expect(dollar).toBeInTheDocument();

		const currentBill = screen.getByText('Billing');
		expect(currentBill).toBeInTheDocument();
	});

	test('OnTrail', async () => {
		act(() => {
			render(<BillingContainer />);
		});

		const freeTrailText = await screen.findByText('Free Trial');
		expect(freeTrailText).toBeInTheDocument();

		const currentBill = screen.getByText('Billing');
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

		const currentBill = screen.getByText('Billing');
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
		const { findByText } = render(<BillingContainer />);

		const billingPeriodText = `Your current billing period is from ${getFormattedDate(
			billingSuccessResponse.data.billingPeriodStart,
		)} to ${getFormattedDate(billingSuccessResponse.data.billingPeriodEnd)}`;

		const billingPeriod = await findByText(billingPeriodText);
		expect(billingPeriod).toBeInTheDocument();

		const currentBill = screen.getByText('Billing');
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
