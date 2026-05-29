import userEvent from '@testing-library/user-event';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { cleanup, fireEvent, screen, waitFor } from 'tests/test-utils';

import { flushNuqsUrl, renderTriggeredAlerts, resetUrl } from './_helpers';

const safeNavigateMock = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: safeNavigateMock })),
}));

const logEventMock = jest.fn();
jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: (...args: unknown[]): unknown => logEventMock(...args),
}));

describe('TriggeredAlerts — row click', () => {
	jest.setTimeout(15000);

	beforeEach(() => {
		resetUrl();
	});

	afterEach(async () => {
		cleanup();
		await flushNuqsUrl();
		resetUrl();
	});

	it('navigates to the alert overview with the rule id from labels on row click', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(
			() => expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		await user.click(screen.getByText('High CPU Usage'));

		expect(safeNavigateMock).toHaveBeenCalledWith(
			'/alerts/overview?ruleId=rule-1',
		);
		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Triggered alert clicked',
			expect.objectContaining({
				ruleId: 'rule-1',
				alertName: 'High CPU Usage',
			}),
		);
	});

	it('opens in a new tab when ctrl+clicked', async () => {
		renderTriggeredAlerts();

		await waitFor(
			() => expect(screen.getByText('Memory Warning')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		fireEvent.click(screen.getByText('Memory Warning'), { ctrlKey: true });

		expect(safeNavigateMock).toHaveBeenCalledWith(
			'/alerts/overview?ruleId=rule-2',
			{ newTab: true },
		);
	});

	it('navigates correctly when ruleId is parsed from generatorURL', async () => {
		// Override fixture so the alert has no labels.ruleId but a valid
		// generatorURL → getRuleId() falls back to parsing the URL.
		server.use(
			rest.get('http://localhost/api/v1/alerts', (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: [
							{
								fingerprint: 'fp-no-rule-label',
								startsAt: '2023-10-19T10:00:00Z',
								endsAt: '0001-01-01T00:00:00Z',
								updatedAt: '2023-10-20T00:00:00Z',
								generatorURL: 'http://localhost/alerts/edit?ruleId=rule-from-url',
								labels: { alertname: 'URL Rule Alert' },
								annotations: {},
								status: { state: 'active', silencedBy: [], inhibitedBy: [] },
								receivers: [],
							},
						],
						status: 'success',
					}),
				),
			),
		);

		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(
			() => expect(screen.getByText('URL Rule Alert')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		await user.click(screen.getByText('URL Rule Alert'));

		expect(safeNavigateMock).toHaveBeenCalledWith(
			'/alerts/overview?ruleId=rule-from-url',
		);
	});

	it('does not navigate when the row has no ruleId anywhere', async () => {
		server.use(
			rest.get('http://localhost/api/v1/alerts', (_, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						data: [
							{
								fingerprint: 'fp-no-rule',
								startsAt: '2023-10-19T10:00:00Z',
								endsAt: '0001-01-01T00:00:00Z',
								updatedAt: '2023-10-20T00:00:00Z',
								labels: { alertname: 'No Rule Alert' },
								annotations: {},
								status: { state: 'active', silencedBy: [], inhibitedBy: [] },
								receivers: [],
							},
						],
						status: 'success',
					}),
				),
			),
		);

		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(
			() => expect(screen.getByText('No Rule Alert')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		await user.click(screen.getByText('No Rule Alert'));

		expect(safeNavigateMock).not.toHaveBeenCalled();
	});
});
