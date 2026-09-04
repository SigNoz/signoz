import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import { IsAdminPermission } from 'lib/authz/hooks/useAuthZ/legacy';
import {
	buildDashboardDeletePermission,
	buildDashboardUpdatePermission,
	DashboardCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

import ActionsPopover from './ActionsPopover';

const DASHBOARD_ID = 'abc';

const baseProps = {
	link: '/dashboard/abc',
	dashboardId: DASHBOARD_ID,
	dashboardName: 'My Dashboard',
	createdBy: 'someone-else@signoz.io',
	isLocked: false,
	tags: [],
	onView: jest.fn(),
};

async function openMenu(): Promise<void> {
	await userEvent.click(screen.getByTestId('dashboard-action-icon'));
	await screen.findByTestId('dashboard-action-rename');
}

// The menu body only mounts once the checks resolve, so an item's state is never
// ambiguous between "in flight" and "denied".
function deniedScopes(testId: string): string | null {
	return (
		screen
			.getByTestId(testId)
			.parentElement?.getAttribute('data-denied-permissions') ?? null
	);
}

describe('ActionsPopover - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	describe('laziness', () => {
		it('fires no permission check until the menu is opened', async () => {
			const onCheck = jest.fn();
			server.use(
				rest.post(AUTHZ_CHECK_URL, async (req, res, ctx) => {
					onCheck();
					const payload = await req.json();
					return res(
						ctx.status(200),
						ctx.json({ data: payload, status: 'success' }),
					);
				}),
			);

			render(<ActionsPopover {...baseProps} />);

			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(onCheck).not.toHaveBeenCalled();
		});
	});

	describe('permission denied', () => {
		it('disables the edit actions and explains why when update is denied', async () => {
			server.use(setupAuthzDeny(buildDashboardUpdatePermission(DASHBOARD_ID)));

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			await waitFor(() => {
				expect(deniedScopes('dashboard-action-rename')).toContain(
					buildDashboardUpdatePermission(DASHBOARD_ID),
				);
			});
			expect(screen.getByTestId('dashboard-action-rename')).toBeDisabled();
			expect(screen.getByTestId('dashboard-action-edit-tags')).toBeDisabled();

			// Read-only actions and delete are unaffected.
			expect(screen.getByTestId('dashboard-action-view')).toBeEnabled();
			expect(screen.getByTestId('dashboard-action-delete')).toBeEnabled();
		});

		// Authz guide rule 3: delete does not depend on read.
		it('keeps delete usable for a user holding only delete', async () => {
			server.use(setupAuthzAllow(buildDashboardDeletePermission(DASHBOARD_ID)));

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			await waitFor(() => {
				expect(screen.getByTestId('dashboard-action-delete')).toBeEnabled();
			});
			expect(screen.getByTestId('dashboard-action-rename')).toBeDisabled();
			expect(screen.getByTestId('dashboard-action-duplicate')).toBeDisabled();
		});

		it('disables delete and explains why when delete is denied', async () => {
			server.use(setupAuthzDeny(buildDashboardDeletePermission(DASHBOARD_ID)));

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			await waitFor(() => {
				expect(deniedScopes('dashboard-action-delete')).toBe(
					buildDashboardDeletePermission(DASHBOARD_ID),
				);
			});
			expect(screen.getByTestId('dashboard-action-delete')).toBeDisabled();
			expect(screen.getByTestId('dashboard-action-rename')).toBeEnabled();
		});

		it('disables duplicate without create, leaving rename usable', async () => {
			server.use(setupAuthzDeny(DashboardCreatePermission));

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			await waitFor(() => {
				expect(screen.getByTestId('dashboard-action-rename')).toBeEnabled();
			});
			expect(screen.getByTestId('dashboard-action-duplicate')).toBeDisabled();
		});
	});

	describe('lock', () => {
		it('blocks the toggle for a non-author non-admin who can otherwise edit', async () => {
			// Lock/unlock also needs the backend's creator-or-admin rule, so full
			// dashboard rights are not enough.
			server.use(setupAuthzDeny(IsAdminPermission));

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			await waitFor(() => {
				expect(screen.getByTestId('dashboard-action-rename')).toBeEnabled();
			});
			expect(screen.getByTestId('dashboard-action-lock')).toBeDisabled();
		});

		it('blocks the toggle on an integration-owned dashboard', async () => {
			server.use(setupAuthzAdmin());

			render(<ActionsPopover {...baseProps} createdBy="integration" />);
			await openMenu();

			await waitFor(() => {
				expect(screen.getByTestId('dashboard-action-rename')).toBeEnabled();
			});
			expect(screen.getByTestId('dashboard-action-lock')).toBeDisabled();
		});
	});

	describe('locked dashboard', () => {
		// Lock wins over permission: it is what an edit-capable user can act on.
		it('reports the lock, not the permission, for an editor', async () => {
			server.use(setupAuthzAdmin());

			render(<ActionsPopover {...baseProps} isLocked />);
			await openMenu();

			// Duplicate is not lock-gated, so it resolving marks the checks as settled.
			await waitFor(() => {
				expect(screen.getByTestId('dashboard-action-duplicate')).toBeEnabled();
			});
			expect(screen.getByTestId('dashboard-action-rename')).toBeDisabled();
			expect(deniedScopes('dashboard-action-rename')).toBeNull();
		});
	});

	describe('permission granted', () => {
		it('enables every action for an admin', async () => {
			server.use(setupAuthzAdmin());

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			await waitFor(() => {
				expect(screen.getByTestId('dashboard-action-rename')).toBeEnabled();
			});
			expect(screen.getByTestId('dashboard-action-edit-tags')).toBeEnabled();
			expect(screen.getByTestId('dashboard-action-duplicate')).toBeEnabled();
			expect(screen.getByTestId('dashboard-action-delete')).toBeEnabled();
		});
	});
});
