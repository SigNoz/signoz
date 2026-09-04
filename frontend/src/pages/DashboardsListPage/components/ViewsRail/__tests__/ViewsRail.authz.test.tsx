import { Bookmark } from '@signozhq/icons';
import { server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';
import { setupAuthzAllow } from 'lib/authz/utils/authz-test-utils';
import { DashboardListPermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';

import type { BuiltinView } from '../../../utils/views';
import ViewsRail from '../ViewsRail';

const BUILTIN_VIEWS: BuiltinView[] = [
	{
		id: 'all',
		label: 'All dashboards',
		icon: Bookmark,
		section: 'system',
	} as BuiltinView,
];

const CUSTOM_VIEWS = [
	{ id: 'view-1', name: 'My prod dashboards', query: '', userEmail: 'a@b.co' },
];

function renderRail(
	props?: Partial<React.ComponentProps<typeof ViewsRail>>,
): ReturnType<typeof render> {
	return render(
		<ViewsRail
			activeViewId="view-1"
			builtinViews={BUILTIN_VIEWS}
			customViews={CUSTOM_VIEWS as never}
			customViewsLoading={false}
			isCustomActive
			isModified
			onSelect={jest.fn()}
			onSave={jest.fn()}
			onSaveChanges={jest.fn()}
			onReset={jest.fn()}
			onDelete={jest.fn()}
			onRename={jest.fn()}
			{...props}
		/>,
	);
}

describe('ViewsRail - AuthZ', () => {
	afterEach(() => {
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	// The backend gates saved-view CRUD on dashboard:list, not on edit rights, so a
	// viewer must be able to manage their own views. This guards the regression
	// where the rail was hidden behind edit_dashboard.
	it('lets a user holding only list manage saved views', async () => {
		server.use(setupAuthzAllow(DashboardListPermission));

		renderRail();

		// The popover trigger's testId is swallowed by Radix's asChild clone, so
		// it is matched by its title.
		await expect(
			screen.findByTitle('Save current filters as a view'),
		).resolves.toBeEnabled();
		expect(screen.getByTestId('dashboards-view-save-changes')).toBeEnabled();
		expect(screen.getByLabelText('Rename view')).toBeEnabled();
		expect(screen.getByLabelText('Delete view')).toBeEnabled();
	});

	it('offers save-as-new-view on a builtin view with unsaved filters', async () => {
		server.use(setupAuthzAllow(DashboardListPermission));

		renderRail({ activeViewId: 'all', isCustomActive: false });

		await expect(
			screen.findByTestId('dashboards-view-save-as-new'),
		).resolves.toBeEnabled();
	});
});
