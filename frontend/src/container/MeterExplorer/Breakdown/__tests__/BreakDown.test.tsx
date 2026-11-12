import type { DashboardControlsInput } from 'pages/DashboardPage/DashboardContainer/controls/types';
import { resolveControls } from 'pages/DashboardPage/DashboardContainer/controls/dashboardControls';
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
	it('mounts the cost meter system dashboard as charts only, without auto-refresh', () => {
		render(<BreakDown />);

		const dashboard = screen.getByTestId('system-dashboard');
		expect(dashboard).toHaveAttribute('data-name', 'cost-meter-breakdown');
		const controls = resolveControls(
			JSON.parse(dashboard.getAttribute('data-controls') ?? ''),
			true,
		);
		expect(controls.header.breadcrumbs).toBe(false);
		expect(controls.panelActions.createAlert).toBe(false);
		expect(controls.panelActions.drilldown).toBe(false);
		expect(controls.panelActions.zoom).toBe(true);
		expect(controls.toolbar.autoRefresh).toBe(false);
		expect(controls.toolbar.timeRange).toBe(true);
	});

	it('keeps the UTC billing notice above the dashboard', () => {
		render(<BreakDown />);

		expect(screen.getByText(/Billing is calculated in UTC/)).toBeInTheDocument();
	});
});
