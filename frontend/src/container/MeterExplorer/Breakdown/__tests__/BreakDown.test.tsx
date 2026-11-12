import type { DashboardControlsInput } from 'pages/DashboardPage/DashboardContainer/controls/types';
import { render, screen } from 'tests/test-utils';

import type { SystemDashboardHost } from 'container/SystemDashboard/systemDashboardHost';

import BreakDown from '../BreakDown';

jest.mock('container/SystemDashboard/SystemDashboard', () => ({
	__esModule: true,
	default: ({
		host,
		controls,
	}: {
		host: SystemDashboardHost;
		controls: DashboardControlsInput;
	}): JSX.Element => (
		<div
			data-testid="system-dashboard"
			data-name={host.name}
			data-controls={JSON.stringify(controls)}
		/>
	),
}));

describe('Cost meter breakdown', () => {
	it('mounts the cost meter system dashboard without panel actions', () => {
		render(<BreakDown />);

		const dashboard = screen.getByTestId('system-dashboard');
		expect(dashboard).toHaveAttribute('data-name', 'cost-meter-breakdown');
		expect(
			JSON.parse(dashboard.getAttribute('data-controls') ?? ''),
		).toStrictEqual({
			header: false,
			title: false,
			dashboardActions: false,
			toolbar: { autoRefresh: false },
			panelActions: false,
		});
	});

	it('keeps the UTC billing notice above the dashboard', () => {
		render(<BreakDown />);

		expect(screen.getByText(/Billing is calculated in UTC/)).toBeInTheDocument();
	});
});
