import userEvent from '@testing-library/user-event';
import { logEventMock } from '__tests__/logEventMock';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, waitFor } from 'tests/test-utils';

import { getTriggeredAlertRowTestId, renderTriggeredAlerts } from './_helpers';

describe('TriggeredAlerts — row click', () => {
	it('navigates to the alert overview with the rule id from labels on row click', async () => {
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(
				screen.getByTestId(getTriggeredAlertRowTestId('fp-critical-1', 'name')),
			).toBeInTheDocument(),
		);

		await user.click(
			screen.getByTestId(getTriggeredAlertRowTestId('fp-critical-1', 'name')),
		);

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
		const user = userEvent.setup({ delay: null });
		renderTriggeredAlerts();

		await waitFor(() =>
			expect(
				screen.getByTestId(getTriggeredAlertRowTestId('fp-warning-1', 'name')),
			).toBeInTheDocument(),
		);

		await user.keyboard('{Control>}');
		await user.click(
			screen.getByTestId(getTriggeredAlertRowTestId('fp-warning-1', 'name')),
		);
		await user.keyboard('{/Control}');

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

		await waitFor(() =>
			expect(
				screen.getByTestId(getTriggeredAlertRowTestId('fp-no-rule-label', 'name')),
			).toBeInTheDocument(),
		);

		await user.click(
			screen.getByTestId(getTriggeredAlertRowTestId('fp-no-rule-label', 'name')),
		);

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

		await waitFor(() =>
			expect(
				screen.getByTestId(getTriggeredAlertRowTestId('fp-no-rule', 'name')),
			).toBeInTheDocument(),
		);

		await user.click(
			screen.getByTestId(getTriggeredAlertRowTestId('fp-no-rule', 'name')),
		);

		expect(safeNavigateMock).not.toHaveBeenCalled();
	});
});
