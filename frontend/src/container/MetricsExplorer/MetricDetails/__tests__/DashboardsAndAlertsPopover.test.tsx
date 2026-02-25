import { render, screen } from '@testing-library/react';
import * as metricsExplorerHooks from 'api/generated/services/metrics';
import { QueryParams } from 'constants/query';
import { userEvent } from 'tests/test-utils';

import DashboardsAndAlertsPopover from '../DashboardsAndAlertsPopover';
import {
	getMockAlertsData,
	getMockDashboardsData,
	MOCK_ALERT_1,
	MOCK_ALERT_2,
	MOCK_DASHBOARD_1,
	MOCK_DASHBOARD_2,
	MOCK_METRIC_NAME,
} from './testUtlls';

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

const useGetMetricAlertsMock = jest.spyOn(
	metricsExplorerHooks,
	'useGetMetricAlerts',
);
const useGetMetricDashboardsMock = jest.spyOn(
	metricsExplorerHooks,
	'useGetMetricDashboards',
);

describe('DashboardsAndAlertsPopover', () => {
	beforeEach(() => {
		useGetMetricAlertsMock.mockReturnValue(getMockAlertsData());
		useGetMetricDashboardsMock.mockReturnValue(getMockDashboardsData());
	});

	it('renders the popover correctly with multiple dashboards and alerts', () => {
		render(<DashboardsAndAlertsPopover metricName={MOCK_METRIC_NAME} />);

		expect(screen.getByText(`2 dashboards`)).toBeInTheDocument();
		expect(screen.getByText(`2 alert rules`)).toBeInTheDocument();
	});

	it('renders null with no dashboards and alerts', () => {
		useGetMetricAlertsMock.mockReturnValue(
			getMockAlertsData({
				data: {
					alerts: [],
				},
			}),
		);
		useGetMetricDashboardsMock.mockReturnValue(
			getMockDashboardsData({
				data: {
					dashboards: [],
				},
			}),
		);

		const { container } = render(
			<DashboardsAndAlertsPopover metricName={MOCK_METRIC_NAME} />,
		);
		expect(
			container.querySelector('dashboards-and-alerts-popover-container'),
		).toBeNull();
	});

	it('renders popover with single dashboard and alert', () => {
		useGetMetricAlertsMock.mockReturnValue(
			getMockAlertsData({
				data: {
					alerts: [MOCK_ALERT_1],
				},
			}),
		);
		useGetMetricDashboardsMock.mockReturnValue(
			getMockDashboardsData({
				data: {
					dashboards: [MOCK_DASHBOARD_1],
				},
			}),
		);

		render(<DashboardsAndAlertsPopover metricName={MOCK_METRIC_NAME} />);

		expect(screen.getByText(`1 dashboard`)).toBeInTheDocument();
		expect(screen.getByText(`1 alert rule`)).toBeInTheDocument();
	});

	it('renders popover with dashboard id if name is not available', async () => {
		useGetMetricDashboardsMock.mockReturnValue(
			getMockDashboardsData({
				data: {
					dashboards: [{ ...MOCK_DASHBOARD_1, dashboardName: '' }],
				},
			}),
		);

		render(<DashboardsAndAlertsPopover metricName={MOCK_METRIC_NAME} />);

		await userEvent.click(screen.getByText(`1 dashboard`));
		expect(screen.getByText(MOCK_DASHBOARD_1.dashboardId)).toBeInTheDocument();
	});

	it('renders popover with alert id if name is not available', async () => {
		useGetMetricAlertsMock.mockReturnValue(
			getMockAlertsData({
				data: {
					alerts: [{ ...MOCK_ALERT_1, alertName: '' }],
				},
			}),
		);

		render(<DashboardsAndAlertsPopover metricName={MOCK_METRIC_NAME} />);

		await userEvent.click(screen.getByText(`1 alert rule`));
		expect(screen.getByText(MOCK_ALERT_1.alertId)).toBeInTheDocument();
	});

	it('navigates to the dashboard when the dashboard is clicked', async () => {
		render(<DashboardsAndAlertsPopover metricName={MOCK_METRIC_NAME} />);

		// Click on 2 dashboards button
		await userEvent.click(screen.getByText(`2 dashboards`));
		// Popover showing list of 2 dashboards should be visible
		expect(screen.getByText(MOCK_DASHBOARD_1.dashboardName)).toBeInTheDocument();
		expect(screen.getByText(MOCK_DASHBOARD_2.dashboardName)).toBeInTheDocument();

		// Click on the first dashboard
		await userEvent.click(screen.getByText(MOCK_DASHBOARD_1.dashboardName));

		// Should navigate to the dashboard
		expect(mockSafeNavigate).toHaveBeenCalledWith(
			`/dashboard/${MOCK_DASHBOARD_1.dashboardId}`,
		);
	});

	it('navigates to the alert when the alert is clicked', async () => {
		render(<DashboardsAndAlertsPopover metricName={MOCK_METRIC_NAME} />);

		// Click on 2 alert rules button
		await userEvent.click(screen.getByText(`2 alert rules`));
		// Popover showing list of 2 alert rules should be visible
		expect(screen.getByText(MOCK_ALERT_1.alertName)).toBeInTheDocument();
		expect(screen.getByText(MOCK_ALERT_2.alertName)).toBeInTheDocument();

		// Click on the first alert rule
		await userEvent.click(screen.getByText(MOCK_ALERT_1.alertName));

		// Should navigate to the alert rule
		expect(mockSetQuery).toHaveBeenCalledWith(
			QueryParams.ruleId,
			MOCK_ALERT_1.alertId,
		);
	});

	it('renders unique dashboards even when there are duplicates', async () => {
		useGetMetricDashboardsMock.mockReturnValue(
			getMockDashboardsData({
				data: {
					dashboards: [MOCK_DASHBOARD_1, MOCK_DASHBOARD_2, MOCK_DASHBOARD_1],
				},
			}),
		);

		render(<DashboardsAndAlertsPopover metricName={MOCK_METRIC_NAME} />);

		expect(screen.getByText('2 dashboards')).toBeInTheDocument();

		await userEvent.click(screen.getByText('2 dashboards'));
		expect(screen.getByText(MOCK_DASHBOARD_1.dashboardName)).toBeInTheDocument();
		expect(screen.getByText(MOCK_DASHBOARD_2.dashboardName)).toBeInTheDocument();
	});
});
