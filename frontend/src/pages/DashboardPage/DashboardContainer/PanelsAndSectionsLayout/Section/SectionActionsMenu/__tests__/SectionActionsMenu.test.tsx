import { server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { buildDashboardUpdatePermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import { setupAuthzDeny } from 'lib/authz/utils/authz-test-utils';

import SectionActionsMenu from '../SectionActionsMenu';

const SECTION_ID = 'section-1';
const MENU_TEST_ID = `dashboard-section-actions-${SECTION_ID}`;
const updatePermission = buildDashboardUpdatePermission('dashboard-1');

async function openMenu(): Promise<void> {
	await userEvent.click(screen.getByTestId(MENU_TEST_ID));
	await screen.findByTestId(`${MENU_TEST_ID}-item-rename`);
}

describe('SectionActionsMenu', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('renders only the actions it has handlers for', async () => {
		render(<SectionActionsMenu sectionId={SECTION_ID} onRename={jest.fn()} />);
		await openMenu();

		expect(
			screen.queryByTestId(`${MENU_TEST_ID}-item-delete-section`),
		).not.toBeInTheDocument();
	});

	it('disables every row with the given reason', async () => {
		render(
			<SectionActionsMenu
				sectionId={SECTION_ID}
				disabledChecks={[updatePermission]}
				disabledTooltip="This dashboard is locked"
				onRename={jest.fn()}
				onDeleteSection={jest.fn()}
			/>,
		);
		await openMenu();

		const rename = screen.getByTestId(`${MENU_TEST_ID}-item-rename`);
		expect(rename).toHaveAttribute('data-disabled');
		expect(
			screen.getByTestId(`${MENU_TEST_ID}-item-delete-section`),
		).toHaveAttribute('data-disabled');

		await userEvent.hover(rename);
		await expect(screen.findByRole('tooltip')).resolves.toHaveTextContent(
			'This dashboard is locked',
		);
	});

	it('names the missing permission when there is no other reason', async () => {
		server.use(setupAuthzDeny(updatePermission));
		const onRename = jest.fn();
		render(
			<SectionActionsMenu
				sectionId={SECTION_ID}
				disabledChecks={[updatePermission]}
				onRename={onRename}
			/>,
		);
		await openMenu();

		const rename = screen.getByTestId(`${MENU_TEST_ID}-item-rename`);
		await waitFor(
			() => {
				expect(rename).toHaveAttribute('data-disabled');
			},
			{ timeout: 3000 },
		);

		await userEvent.hover(rename);
		await expect(screen.findByRole('tooltip')).resolves.toHaveTextContent(
			'is not authorized to perform update',
		);
		await userEvent.click(rename);
		expect(onRename).not.toHaveBeenCalled();
	});
});
