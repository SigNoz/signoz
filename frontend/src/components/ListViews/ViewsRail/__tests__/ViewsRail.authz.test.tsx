import { Bookmark } from '@signozhq/icons';
import { server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';
import { setupAuthzAllow } from 'lib/authz/utils/authz-test-utils';
import { DashboardListPermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

import ViewsRailGuard from 'pages/DashboardsListPage/components/DashboardsList/ViewsRailGuard';

import type { BuiltinListView } from '../../types';
import ViewsRail from '../ViewsRail';

const BUILTIN_VIEWS: BuiltinListView[] = [
	{
		id: 'all',
		label: 'All dashboards',
		icon: Bookmark,
		section: 'system',
	},
];

const CUSTOM_VIEWS = [{ id: 'view-1', name: 'My prod dashboards' }];

function renderRail(
	props?: Partial<React.ComponentProps<typeof ViewsRail>>,
): ReturnType<typeof render> {
	return render(
		<ViewsRail
			activeViewId="view-1"
			builtinViews={BUILTIN_VIEWS}
			customViews={CUSTOM_VIEWS}
			customViewsLoading={false}
			isCustomActive
			isModified
			onSelect={jest.fn()}
			onSave={jest.fn()}
			onSaveChanges={jest.fn()}
			onReset={jest.fn()}
			onDelete={jest.fn()}
			onRename={jest.fn()}
			testIdPrefix="dashboards"
			guard={(content): JSX.Element => <ViewsRailGuard>{content}</ViewsRailGuard>}
			{...props}
		/>,
	);
}

describe('ViewsRail - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	// View CRUD is gated on dashboard:list, not edit rights, so a viewer can
	// manage views. Guards the regression where the rail sat behind edit_dashboard.
	it('lets a user holding only list manage saved views', async () => {
		server.use(setupAuthzAllow(DashboardListPermission));

		renderRail();

		// Radix's asChild clone swallows the trigger's testId, so match its label.
		await expect(
			screen.findByLabelText('Save current filters as a view'),
		).resolves.not.toHaveAttribute('aria-disabled', 'true');
		expect(
			screen.getByTestId('dashboards-view-save-changes'),
		).not.toHaveAttribute('aria-disabled', 'true');
		expect(screen.getByLabelText('Rename view')).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
		expect(screen.getByLabelText('Delete view')).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('offers save-as-new-view on a builtin view with unsaved filters', async () => {
		server.use(setupAuthzAllow(DashboardListPermission));

		renderRail({ activeViewId: 'all', isCustomActive: false });

		await expect(
			screen.findByTestId('dashboards-view-save-as-new'),
		).resolves.not.toHaveAttribute('aria-disabled', 'true');
	});
});
