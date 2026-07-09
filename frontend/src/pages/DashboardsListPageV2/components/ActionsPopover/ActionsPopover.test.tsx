import { render, screen, userEvent } from 'tests/test-utils';

import ActionsPopover from './ActionsPopover';

const baseProps = {
	link: '/dashboard/abc',
	dashboardId: 'abc',
	dashboardName: 'My Dashboard',
	createdBy: 'someone-else@signoz.io',
	isLocked: false,
	tags: [],
	canEdit: true,
	onView: jest.fn(),
};

describe('ActionsPopover', () => {
	it('shows the full set of actions for a v2 dashboard', async () => {
		render(<ActionsPopover {...baseProps} />);
		await userEvent.click(screen.getByTestId('dashboard-action-icon'));

		await screen.findByTestId('dashboard-action-view');
		expect(screen.getByTestId('dashboard-action-view')).toBeInTheDocument();
		expect(
			screen.getByTestId('dashboard-action-open-new-tab'),
		).toBeInTheDocument();
		expect(screen.getByTestId('dashboard-action-copy-link')).toBeInTheDocument();
		expect(screen.getByTestId('dashboard-action-rename')).toBeInTheDocument();
		expect(screen.getByTestId('dashboard-action-edit-tags')).toBeInTheDocument();
		expect(screen.getByTestId('dashboard-action-duplicate')).toBeInTheDocument();
		expect(screen.getByTestId('dashboard-action-delete')).toBeInTheDocument();
	});

	it('keeps only Delete for a legacy dashboard', async () => {
		render(<ActionsPopover {...baseProps} isLegacy />);
		await userEvent.click(screen.getByTestId('dashboard-action-icon'));

		// Delete is the one action that still applies to a legacy blob.
		await screen.findByTestId('dashboard-action-delete');
		expect(screen.getByTestId('dashboard-action-delete')).toBeInTheDocument();

		expect(screen.queryByTestId('dashboard-action-view')).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('dashboard-action-open-new-tab'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('dashboard-action-copy-link'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('dashboard-action-rename'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('dashboard-action-edit-tags'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('dashboard-action-duplicate'),
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('dashboard-action-lock')).not.toBeInTheDocument();
	});
});
