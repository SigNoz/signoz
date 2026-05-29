import { cloneElement, useState as useStateImport } from 'react';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { cleanup, fireEvent, screen, waitFor } from 'tests/test-utils';

import {
	findAlertRow,
	flushNuqsUrl,
	renderListAlertRules,
	resetUrl,
} from './_helpers';

jest.mock(
	'@signozhq/ui/divider',
	() => ({
		Divider: ({ children }: { children?: React.ReactNode }): JSX.Element => (
			<div>{children}</div>
		),
	}),
	{ virtual: true },
);

const safeNavigateMock = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: safeNavigateMock })),
}));

const logEventMock = jest.fn();
jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: (...args: unknown[]): unknown => logEventMock(...args),
}));

const toastPromiseMock = jest.fn();
jest.mock(
	'@signozhq/ui/sonner',
	() => ({
		toast: {
			promise: (promise: unknown, opts: unknown): unknown => {
				toastPromiseMock(promise, opts);
				if (
					promise &&
					typeof (promise as { catch?: unknown }).catch === 'function'
				) {
					(promise as Promise<unknown>).catch(() => {});
				}
				return promise;
			},
		},
	}),
	{ virtual: true },
);

// Stand-in for Radix DropdownMenuSimple: items render only after the trigger
// child is clicked, mirroring real open/close semantics. Tests must click the
// trigger (data-testid="alert-actions") before menu items are reachable.
jest.mock(
	'@signozhq/ui/dropdown-menu',
	() => {
		type MenuItem = {
			key: string;
			label?: string;
			onClick?: () => void;
			type?: string;
			disabled?: boolean;
		};

		function DropdownMenuSimple({
			children,
			menu,
		}: {
			children: React.ReactElement;
			menu: { items: MenuItem[] };
		}): JSX.Element {
			const [open, setOpen] = useStateImport(false);
			const triggerWithToggle = cloneElement(children, {
				onClick: (e: React.MouseEvent): void => {
					children.props.onClick?.(e);
					setOpen((v) => !v);
				},
			});
			return (
				<>
					{triggerWithToggle}
					{open ? (
						<div data-testid="dropdown-menu-portal">
							{menu.items
								.filter((it) => it.type !== 'divider')
								.map((it) => (
									<button
										key={it.key}
										type="button"
										disabled={it.disabled}
										onClick={(): void => it.onClick?.()}
									>
										{it.label}
									</button>
								))}
						</div>
					) : null}
				</>
			);
		}

		return { DropdownMenuSimple };
	},
	{ virtual: true },
);

async function openActionsMenu(row: HTMLElement): Promise<void> {
	const trigger = row.querySelector(
		'[data-testid="alert-actions"]',
	) as HTMLElement | null;
	expect(trigger).not.toBeNull();
	fireEvent.click(trigger as HTMLElement);
	await screen.findByTestId('dropdown-menu-portal');
}

function clickMenuItem(label: string): void {
	const portal = screen.getByTestId('dropdown-menu-portal');
	const btn = Array.from(portal.querySelectorAll('button')).find(
		(b) => b.textContent === label,
	);
	expect(btn).toBeDefined();
	fireEvent.click(btn as HTMLElement);
}

jest.setTimeout(30000);

describe('ListAlertRules — actions menu', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		cleanup();
		resetUrl();
	});

	afterEach(async () => {
		await flushNuqsUrl();
		resetUrl();
	});

	it('renders Enable/Disable/Edit/Edit in New Tab/Clone/Delete items after opening the menu', async () => {
		renderListAlertRules();
		const row = await findAlertRow('High CPU Alert');

		// Items are not in the DOM until the trigger is clicked.
		expect(screen.queryByTestId('dropdown-menu-portal')).not.toBeInTheDocument();

		await openActionsMenu(row);

		const portal = screen.getByTestId('dropdown-menu-portal');
		const labels = Array.from(portal.querySelectorAll('button')).map(
			(b) => b.textContent,
		);
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

		const portal = screen.getByTestId('dropdown-menu-portal');
		const labels = Array.from(portal.querySelectorAll('button')).map(
			(b) => b.textContent,
		);
		expect(labels).toContain('Enable');
		expect(labels).not.toContain('Disable');
	});

	it('toggle action: clicking Disable sends PATCH with disabled:true and toasts', async () => {
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
		clickMenuItem('Disable');

		await waitFor(() => {
			expect(toastPromiseMock).toHaveBeenCalled();
		});

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
		clickMenuItem('Edit');

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
		clickMenuItem('Edit in New Tab');

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
		clickMenuItem('Clone');

		await waitFor(() => {
			expect(toastPromiseMock).toHaveBeenCalled();
		});

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

	it('delete action: sends DELETE for the rule id and toasts', async () => {
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
		clickMenuItem('Delete');

		await waitFor(() => {
			expect(toastPromiseMock).toHaveBeenCalled();
		});

		await waitFor(() => {
			expect(deletedId).toBe('rule-1');
		});

		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: Action',
			expect.objectContaining({ action: 'Delete', ruleId: 'rule-1' }),
		);
	});

	it('error path: toast.promise still called when server returns 500', async () => {
		server.use(
			rest.patch('http://localhost/api/v2/rules/:id', (_, res, ctx) =>
				res(ctx.status(500), ctx.json({ status: 'error' })),
			),
		);

		renderListAlertRules();
		const row = await findAlertRow('High CPU Alert');
		await openActionsMenu(row);
		clickMenuItem('Disable');

		await waitFor(() => {
			expect(toastPromiseMock).toHaveBeenCalled();
		});
		const [, opts] = toastPromiseMock.mock.calls[0];
		expect(opts).toStrictEqual(
			expect.objectContaining({ error: expect.any(Function) }),
		);
	});
});
