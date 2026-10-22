import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import {
	AUTHZ_CHECK_URL,
	setupAuthzAdmin,
	setupAuthzAllow,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildDashboardDeletePermission,
	buildDashboardUpdatePermission,
	DashboardCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';

import ActionsPopover from './ActionsPopover';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

const DASHBOARD_ID = 'abc';

const baseProps = {
	link: '/dashboard/abc',
	dashboardId: DASHBOARD_ID,
	dashboardName: 'My Dashboard',
	createdBy: 'someone-else@signoz.io',
	source: DashboardtypesSourceDTO.user,
	isLocked: false,
	tags: [],
	onView: jest.fn(),
};

async function openMenu(): Promise<void> {
	await userEvent.click(screen.getByTestId('dashboard-action-icon'));
	await screen.findByTestId('dashboard-action-rename');
	// Rows waiting on their check show as loading, not disabled.
	await waitFor(() => {
		expect(document.querySelector('[data-loading]')).toBeNull();
	});
}

function isRowDisabled(testId: string): boolean {
	return screen.getByTestId(testId).hasAttribute('data-disabled');
}

async function rowTooltip(testId: string): Promise<string> {
	await userEvent.hover(screen.getByTestId(testId));
	const tooltip = await screen.findByRole('tooltip');
	return tooltip.textContent ?? '';
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
				expect(isRowDisabled('dashboard-action-rename')).toBe(true);
			});
			expect(isRowDisabled('dashboard-action-edit-tags')).toBe(true);
			await expect(rowTooltip('dashboard-action-rename')).resolves.toContain(
				formatPermission(buildDashboardUpdatePermission(DASHBOARD_ID)),
			);

			// Read-only actions and delete are unaffected.
			expect(isRowDisabled('dashboard-action-view')).toBe(false);
			expect(isRowDisabled('dashboard-action-delete')).toBe(false);
		});

		// Authz guide rule 3: delete does not depend on read.
		it('keeps delete usable for a user holding only delete', async () => {
			server.use(setupAuthzAllow(buildDashboardDeletePermission(DASHBOARD_ID)));

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			await waitFor(() => {
				expect(isRowDisabled('dashboard-action-rename')).toBe(true);
			});
			expect(isRowDisabled('dashboard-action-duplicate')).toBe(true);
			expect(isRowDisabled('dashboard-action-delete')).toBe(false);
		});

		it('disables delete and explains why when delete is denied', async () => {
			server.use(setupAuthzDeny(buildDashboardDeletePermission(DASHBOARD_ID)));

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			await waitFor(() => {
				expect(isRowDisabled('dashboard-action-delete')).toBe(true);
			});
			expect(isRowDisabled('dashboard-action-rename')).toBe(false);
			await expect(rowTooltip('dashboard-action-delete')).resolves.toContain(
				formatPermission(buildDashboardDeletePermission(DASHBOARD_ID)),
			);
		});

		it('disables duplicate without create, leaving rename usable', async () => {
			server.use(setupAuthzDeny(DashboardCreatePermission));

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			await waitFor(() => {
				expect(isRowDisabled('dashboard-action-duplicate')).toBe(true);
			});
			expect(isRowDisabled('dashboard-action-rename')).toBe(false);
		});
	});

	describe('locked dashboard', () => {
		// Access before state: without the permission, the lock is the wrong thing
		// to point at.
		it('reports the permission, not the lock, without edit rights', async () => {
			server.use(setupAuthzDeny(buildDashboardUpdatePermission(DASHBOARD_ID)));

			render(<ActionsPopover {...baseProps} isLocked />);
			await openMenu();

			await waitFor(() => {
				expect(isRowDisabled('dashboard-action-rename')).toBe(true);
			});
			const tooltip = await rowTooltip('dashboard-action-rename');
			expect(tooltip).toContain(
				formatPermission(buildDashboardUpdatePermission(DASHBOARD_ID)),
			);
			expect(tooltip).not.toContain('dashboard_locked');
		});

		it('reports the lock, not the permission, for an editor', async () => {
			server.use(setupAuthzAdmin());

			render(<ActionsPopover {...baseProps} isLocked />);
			await openMenu();

			// Duplicate is not lock-gated, so it resolving marks the checks as settled.
			await waitFor(() => {
				expect(isRowDisabled('dashboard-action-rename')).toBe(true);
			});
			// Jest renders i18n keys.
			await expect(rowTooltip('dashboard-action-rename')).resolves.toBe(
				'dashboard_locked',
			);
		});
	});

	describe('permission granted', () => {
		it('enables every action for an admin', async () => {
			server.use(setupAuthzAdmin());

			render(<ActionsPopover {...baseProps} />);
			await openMenu();

			expect(isRowDisabled('dashboard-action-rename')).toBe(false);
			expect(isRowDisabled('dashboard-action-edit-tags')).toBe(false);
			expect(isRowDisabled('dashboard-action-duplicate')).toBe(false);
			expect(isRowDisabled('dashboard-action-delete')).toBe(false);
		});
	});
});
