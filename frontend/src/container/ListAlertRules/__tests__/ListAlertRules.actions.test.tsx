import userEvent from '@testing-library/user-event';
import { logEventMock } from '__tests__/logEventMock';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, waitFor } from 'tests/test-utils';

import { findAlertRow, renderListAlertRules } from './_helpers';

async function openActionsMenu(row: HTMLElement): Promise<void> {
	const trigger = row.querySelector(
		'[data-testid="alert-actions"]',
	) as HTMLElement | null;
	expect(trigger).not.toBeNull();
	const user = userEvent.setup({ delay: null });
	await user.click(trigger as HTMLElement);
	// Radix renders the menu items in a portal once the trigger is activated.
	await screen.findByRole('menu');
}

async function clickMenuItem(label: string): Promise<void> {
	const user = userEvent.setup({ delay: null });
	const item = await screen.findByRole('menuitem', { name: label });
	await user.click(item);
}

describe('ListAlertRules — actions menu', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('renders Enable/Disable/Edit/Edit in New Tab/Clone/Delete items after opening the menu', async () => {
		renderListAlertRules();
		const row = await findAlertRow('High CPU Alert');

		expect(screen.queryByRole('menu')).not.toBeInTheDocument();

		await openActionsMenu(row);

		const items = screen.getAllByRole('menuitem');
		const labels = items.map((it) => it.textContent);
		expect(labels).toStrictEqual(
			expect.arrayContaining([
				'Edit',
				'Edit in New Tab',
				'Clone',
				'Delete',
				'Disable',
			]),
		);
	});

	it('disabled rule (rule-4) shows "Enable" instead of "Disable"', async () => {
		renderListAlertRules();
		const row = await findAlertRow('Disabled Alert');
		await openActionsMenu(row);

		const items = screen.getAllByRole('menuitem');
		const labels = items.map((it) => it.textContent);
		expect(labels).toContain('Enable');
		expect(labels).not.toContain('Disable');
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

		renderListAlertRules();
		const row = await findAlertRow('High CPU Alert');
		await openActionsMenu(row);
		await clickMenuItem('Disable');

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
		renderListAlertRules();
		const row = await findAlertRow('High CPU Alert');
		await openActionsMenu(row);
		await clickMenuItem('Edit');

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
		renderListAlertRules();
		const row = await findAlertRow('High CPU Alert');
		await openActionsMenu(row);
		await clickMenuItem('Edit in New Tab');

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});
		const [url, options] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('ruleId=rule-1');
		expect(options).toStrictEqual(expect.objectContaining({ newTab: true }));
	});

	it('clone action: sends POST with " - Copy" suffix and opens the cloned rule returned by the API', async () => {
		let capturedPostBody: unknown = null;
		server.use(
			rest.post('http://localhost/api/v2/rules', async (req, res, ctx) => {
				capturedPostBody = await req.json();
				return res(
					ctx.status(201),
					ctx.json({
						data: {
							...(capturedPostBody as Record<string, unknown>),
							id: 'cloned-from-server',
						},
						status: 'success',
					}),
				);
			}),
		);

		renderListAlertRules();
		const row = await findAlertRow('High CPU Alert');
		await openActionsMenu(row);
		await clickMenuItem('Clone');

		await waitFor(() => {
			expect(capturedPostBody).toStrictEqual(
				expect.objectContaining({ alert: 'High CPU Alert - Copy' }),
			);
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

		renderListAlertRules();
		const row = await findAlertRow('High CPU Alert');
		await openActionsMenu(row);
		await clickMenuItem('Delete');

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

		renderListAlertRules();
		const row = await findAlertRow('High CPU Alert');
		await openActionsMenu(row);
		await clickMenuItem('Disable');

		await waitFor(() => {
			expect(patchAttempted).toBe(true);
		});

		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Action',
			expect.objectContaining({ action: 'Enable/Disable', ruleId: 'rule-1' }),
		);
	});
});
