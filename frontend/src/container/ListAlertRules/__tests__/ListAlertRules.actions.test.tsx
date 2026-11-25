import { logEventMock } from '__tests__/logEventMock';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { ActionsMenu } from 'container/ListAlertRules/components';
import type { AlertRule } from 'container/ListAlertRules/types';
import { useAlertRulesHandlers } from 'container/ListAlertRules/useAlertRulesHandlers';
import { server } from 'mocks-server/server';
import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

const [HIGH_CPU_RULE, , , DISABLED_RULE] = alertRulesFixture.map(
	(rule): AlertRule => ({ ...rule, thresholds: [] }),
);

function ActionsMenuWithHandlers({ rule }: { rule: AlertRule }): JSX.Element {
	const { handleEdit } = useAlertRulesHandlers(alertRulesFixture.length);
	return <ActionsMenu rule={rule} onEdit={handleEdit} />;
}

async function openActionsMenu(
	user: ReturnType<typeof userEvent.setup>,
	rule: AlertRule = HIGH_CPU_RULE,
): Promise<void> {
	render(<ActionsMenuWithHandlers rule={rule} />);
	await user.click(screen.getByTestId('alert-actions'));
	await screen.findByTestId('alert-actions-item-edit');
}

describe('ListAlertRules — actions menu', () => {
	it('renders Enable/Disable/Edit/Edit in New Tab/Clone/Delete items after opening the menu', async () => {
		const user = userEvent.setup();
		render(<ActionsMenuWithHandlers rule={HIGH_CPU_RULE} />);

		expect(
			screen.queryByTestId('alert-actions-item-edit'),
		).not.toBeInTheDocument();

		await user.click(screen.getByTestId('alert-actions'));

		await expect(
			screen.findByTestId('alert-actions-item-toggle'),
		).resolves.toHaveTextContent(/^Disable$/);
		expect(screen.getByTestId('alert-actions-item-edit')).toHaveTextContent(
			/^Edit$/,
		);
		expect(
			screen.getByTestId('alert-actions-item-edit-new-tab'),
		).toHaveTextContent(/^Edit in New Tab$/);
		expect(screen.getByTestId('alert-actions-item-clone')).toHaveTextContent(
			/^Clone$/,
		);
		expect(screen.getByTestId('alert-actions-item-delete')).toHaveTextContent(
			/^Delete$/,
		);
	});

	it('disabled rule (rule-4) shows "Enable" instead of "Disable"', async () => {
		const user = userEvent.setup();
		await openActionsMenu(user, DISABLED_RULE);

		expect(screen.getByTestId('alert-actions-item-toggle')).toHaveTextContent(
			/^Enable$/,
		);
	});

	it('toggle action: clicking Disable sends PATCH with disabled:true', async () => {
		let capturedBody: unknown = null;
		let capturedPath: string | null = null;
		server.use(
			rest.patch('http://localhost/api/v2/rules/:id', async (req, res, ctx) => {
				capturedBody = await req.json();
				capturedPath = req.params.id as string;
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		const user = userEvent.setup();
		await openActionsMenu(user);
		await user.click(screen.getByTestId('alert-actions-item-toggle'));

		await waitFor(() => {
			expect(capturedBody).toStrictEqual(
				expect.objectContaining({ disabled: true }),
			);
		});
		expect(capturedPath).toBe('rule-1');

		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Action',
			expect.objectContaining({ action: 'Enable/Disable', ruleId: 'rule-1' }),
		);
	});

	it('edit action: clicking Edit navigates via safeNavigate and logs event', async () => {
		const user = userEvent.setup();
		await openActionsMenu(user);
		await user.click(screen.getByTestId('alert-actions-item-edit'));

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});
		expect(safeNavigateMock.mock.calls[0][0]).toContain('ruleId=rule-1');

		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Action',
			expect.objectContaining({ action: 'Edit', ruleId: 'rule-1' }),
		);
	});

	it('edit in new tab action: clicking opens with newTab:true', async () => {
		const user = userEvent.setup();
		await openActionsMenu(user);
		await user.click(screen.getByTestId('alert-actions-item-edit-new-tab'));

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});
		const [url, options] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('ruleId=rule-1');
		expect(options).toStrictEqual(expect.objectContaining({ newTab: true }));
	});

	it('clone action: sends POST to clone endpoint and opens the cloned rule returned by the API', async () => {
		let capturedRuleId: string | null = null;
		server.use(
			rest.post(
				'http://localhost/api/v2/rules/:id/clone',
				async (req, res, ctx) => {
					capturedRuleId = req.params.id as string;
					return res(
						ctx.status(201),
						ctx.json({
							data: {
								...HIGH_CPU_RULE,
								id: 'cloned-from-server',
								alert: 'High CPU Alert - Copy',
							},
							status: 'success',
						}),
					);
				},
			),
		);

		const user = userEvent.setup();
		await openActionsMenu(user);
		await user.click(screen.getByTestId('alert-actions-item-clone'));

		await waitFor(() => {
			expect(capturedRuleId).toBe('rule-1');
		});

		// The id from the server response round-trips into the navigate URL — this
		// protects against a regression where the code hardcodes the id.
		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});
		expect(safeNavigateMock.mock.calls[0][0]).toContain(
			'ruleId=cloned-from-server',
		);

		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Action',
			expect.objectContaining({ action: 'Clone', ruleId: 'rule-1' }),
		);
	});

	it('delete action: sends DELETE for the rule id', async () => {
		let deletedId: string | null = null;
		server.use(
			rest.delete('http://localhost/api/v2/rules/:id', (req, res, ctx) => {
				deletedId = req.params.id as string;
				return res(ctx.status(200), ctx.json({ status: 'success' }));
			}),
		);

		const user = userEvent.setup();
		await openActionsMenu(user);
		await user.click(screen.getByTestId('alert-actions-item-delete'));

		await waitFor(() => {
			expect(deletedId).toBe('rule-1');
		});

		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Action',
			expect.objectContaining({ action: 'Delete', ruleId: 'rule-1' }),
		);
	});

	it('error path: PATCH is still attempted when server returns 500', async () => {
		let patchAttempted = false;
		server.use(
			rest.patch('http://localhost/api/v2/rules/:id', (_, res, ctx) => {
				patchAttempted = true;
				return res(ctx.status(500), ctx.json({ status: 'error' }));
			}),
		);

		const user = userEvent.setup();
		await openActionsMenu(user);
		await user.click(screen.getByTestId('alert-actions-item-toggle'));

		await waitFor(() => {
			expect(patchAttempted).toBe(true);
		});

		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Action',
			expect.objectContaining({ action: 'Enable/Disable', ruleId: 'rule-1' }),
		);
	});
});
