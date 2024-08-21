import { PANEL_TYPES } from 'constants/queryBuilder';
import { AlertDef } from 'types/api/alerts/def';
import { Dashboard, DashboardData } from 'types/api/dashboard/getAll';

export const chartHelpMessage = (
	selectedDashboard: Dashboard | undefined,
	graphType: PANEL_TYPES,
): string => `
Hi Team,

I need help in creating this chart. Here are my dashboard details

Name: ${selectedDashboard?.data.title || ''}
Panel type: ${graphType}
Dashboard Id: ${selectedDashboard?.uuid || ''}

Thanks`;

export const dashboardHelpMessage = (
	data: DashboardData | undefined,
	selectedDashboard: Dashboard | undefined,
): string => `
Hi Team,

I need help with this dashboard. Here are my dashboard details

Name: ${data?.title || ''}
Dashboard Id: ${selectedDashboard?.uuid || ''}

Thanks`;

export const dashboardListMessage = `Hi Team,

I need help with dashboards.
						
Thanks`;

export const listAlertMessage = `Hi Team,

I need help with managing alerts.

Thanks`;

export const onboardingHelpMessage = (
	dataSourceName: string,
	moduleId: string,
): string => `Hi Team,

I am facing issues sending data to SigNoz. Here are my application details

Data Source: ${dataSourceName}
Framework:
Environment:
Module: ${moduleId}

Thanks
`;

export const alertHelpMessage = (
	alertDef: AlertDef,
	ruleId: number,
): string => `
Hi Team,

I need help in configuring this alert. Here are my alert rule details

Name: ${alertDef?.alert || ''}
Alert Type: ${alertDef?.alertType || ''}
State: ${(alertDef as any)?.state || ''}
Alert Id: ${ruleId}

Thanks`;

export const integrationsListMessage = `Hi Team,

I need help with Integrations.

Thanks`;

export const integrationDetailMessage = (
	selectedIntegration: string,
): string => `
Hi Team,

I need help in configuring this integration.

Integration Id: ${selectedIntegration}

Thanks`;
