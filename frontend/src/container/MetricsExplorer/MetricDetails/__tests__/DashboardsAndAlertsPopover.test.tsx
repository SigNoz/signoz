import { fireEvent, render, screen } from '@testing-library/react';
import { QueryParams } from 'constants/query';

import DashboardsAndAlertsPopover from '../DashboardsAndAlertsPopover';

const mockAlert1 = {
	alert_id: '1',
	alert_name: 'Alert 1',
};
const mockAlert2 = {
	alert_id: '2',
	alert_name: 'Alert 2',
};
const mockDashboard1 = {
	dashboard_id: '1',
	dashboard_name: 'Dashboard 1',
};
const mockDashboard2 = {
	dashboard_id: '2',
	dashboard_name: 'Dashboard 2',
};
const mockAlerts = [mockAlert1, mockAlert2];
const mockDashboards = [mockDashboard1, mockDashboard2];

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

const mockSetQuery = jest.fn();
const mockUrlQuery = {
	set: mockSetQuery,
	toString: jest.fn(),
};
jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: jest.fn(() => mockUrlQuery),
}));

describe('DashboardsAndAlertsPopover', () => {
	it('renders the popover correctly with multiple dashboards and alerts', () => {
		render(
			<DashboardsAndAlertsPopover
				alerts={mockAlerts}
				dashboards={mockDashboards}
			/>,
		);

		expect(
			screen.getByText(`${mockDashboards.length} dashboards`),
		).toBeInTheDocument();
		expect(
			screen.getByText(`${mockAlerts.length} alert rules`),
		).toBeInTheDocument();
	});

	it('renders null with no dashboards and alerts', () => {
		const { container } = render(
			<DashboardsAndAlertsPopover alerts={[]} dashboards={[]} />,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it('renders popover with single dashboard and alert', () => {
		render(
			<DashboardsAndAlertsPopover
				alerts={[mockAlert1]}
				dashboards={[mockDashboard1]}
			/>,
		);
		expect(screen.getByText(`1 dashboard`)).toBeInTheDocument();
		expect(screen.getByText(`1 alert rule`)).toBeInTheDocument();
	});

	it('renders popover with dashboard id if name is not available', () => {
		render(
			<DashboardsAndAlertsPopover
				alerts={mockAlerts}
				dashboards={[{ ...mockDashboard1, dashboard_name: undefined } as any]}
			/>,
		);

		fireEvent.click(screen.getByText(`1 dashboard`));
		expect(screen.getByText(mockDashboard1.dashboard_id)).toBeInTheDocument();
	});

	it('renders popover with alert id if name is not available', () => {
		render(
			<DashboardsAndAlertsPopover
				alerts={[{ ...mockAlert1, alert_name: undefined } as any]}
				dashboards={mockDashboards}
			/>,
		);

		fireEvent.click(screen.getByText(`1 alert rule`));
		expect(screen.getByText(mockAlert1.alert_id)).toBeInTheDocument();
	});

	it('navigates to the dashboard when the dashboard is clicked', () => {
		render(
			<DashboardsAndAlertsPopover
				alerts={mockAlerts}
				dashboards={mockDashboards}
			/>,
		);

		// Click on 2 dashboards button
		fireEvent.click(screen.getByText(`${mockDashboards.length} dashboards`));
		// Popover showing list of 2 dashboards should be visible
		expect(screen.getByText(mockDashboard1.dashboard_name)).toBeInTheDocument();
		expect(screen.getByText(mockDashboard2.dashboard_name)).toBeInTheDocument();

		// Click on the first dashboard
		fireEvent.click(screen.getByText(mockDashboard1.dashboard_name));

		// Should navigate to the dashboard
		expect(mockSafeNavigate).toHaveBeenCalledWith(
			`/dashboard/${mockDashboard1.dashboard_id}`,
		);
	});

	it('navigates to the alert when the alert is clicked', () => {
		render(
			<DashboardsAndAlertsPopover
				alerts={mockAlerts}
				dashboards={mockDashboards}
			/>,
		);

		// Click on 2 alert rules button
		fireEvent.click(screen.getByText(`${mockAlerts.length} alert rules`));
		// Popover showing list of 2 alert rules should be visible
		expect(screen.getByText(mockAlert1.alert_name)).toBeInTheDocument();
		expect(screen.getByText(mockAlert2.alert_name)).toBeInTheDocument();

		// Click on the first alert rule
		fireEvent.click(screen.getByText(mockAlert1.alert_name));

		// Should navigate to the alert rule
		expect(mockSetQuery).toHaveBeenCalledWith(
			QueryParams.ruleId,
			mockAlert1.alert_id,
		);
	});

	it('renders unique dashboards even when there are duplicates', () => {
		render(
			<DashboardsAndAlertsPopover
				alerts={mockAlerts}
				dashboards={[...mockDashboards, mockDashboard1]}
			/>,
		);
		expect(
			screen.getByText(`${mockDashboards.length} dashboards`),
		).toBeInTheDocument();

		fireEvent.click(screen.getByText(`${mockDashboards.length} dashboards`));
		expect(screen.getByText(mockDashboard1.dashboard_name)).toBeInTheDocument();
		expect(screen.getByText(mockDashboard2.dashboard_name)).toBeInTheDocument();
	});
});
