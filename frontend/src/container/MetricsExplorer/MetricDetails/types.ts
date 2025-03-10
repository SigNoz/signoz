export interface DashboardsAndAlertsPopoverProps {
	dashboards: MetricDetailsDashboard[] | null;
	alerts: MetricDetailsAlert[] | null;
}

export interface MetricDetailsDashboard {
	dashboard_id: string;
	dashboard_name: string;
}

export interface MetricDetailsAlert {
	alert_id: string;
	alert_name: string;
}
