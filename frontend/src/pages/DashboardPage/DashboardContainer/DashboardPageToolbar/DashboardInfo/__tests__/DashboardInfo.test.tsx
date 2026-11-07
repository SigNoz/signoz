import { render, screen, userEvent } from 'tests/test-utils';

import DashboardInfo from '../DashboardInfo';
import { useDashboardStore } from '../../../store/useDashboardStore';

const mockCopyToClipboard = jest.fn();

jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [null, mockCopyToClipboard],
}));

jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEditContext',
	() => ({
		useDashboardEditContext: (): unknown => ({ isEditable: false }),
	}),
);

describe('DashboardInfo', () => {
	it('copies the dashboard ID', async () => {
		useDashboardStore.setState({ dashboardId: 'dash-1' });

		render(
			<DashboardInfo
				title="Checkout"
				image="data:image/svg+xml,"
				tags={[]}
				description=""
				isPublicDashboard={false}
				publicUrl=""
				isDashboardLocked={false}
				showLockToggle={false}
				isEditing={false}
				draft=""
				onDraftChange={jest.fn()}
				onStartEdit={jest.fn()}
				onCommit={jest.fn()}
				onCancel={jest.fn()}
			/>,
		);

		await userEvent.click(screen.getByTestId('dashboard-copy-id'));

		expect(mockCopyToClipboard).toHaveBeenCalledWith('dash-1');
	});
});
