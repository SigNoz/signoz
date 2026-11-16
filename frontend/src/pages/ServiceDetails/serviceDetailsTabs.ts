import {
	createSystemDashboardHost,
	type SystemDashboardHost,
} from 'container/SystemDashboard/systemDashboardHost';
import { EMBEDDED } from 'pages/DashboardPage/DashboardContainer/controls/presets';
import type { DashboardControlsInput } from 'pages/DashboardPage/DashboardContainer/controls/types';

/** `?tab=` values; kept from the previous page so existing links still land on their tab. */
export enum ServiceDetailsTab {
	Overview = 'OVER_METRICS',
	DbCalls = 'DB_CALL_METRICS',
	ExternalCalls = 'EXTERNAL_METRICS',
}

export interface ServiceDetailsTabConfig {
	key: ServiceDetailsTab;
	label: string;
	/** Keys the store's per-dashboard state, so the page can follow the service picker. */
	dashboardId: string;
	host: SystemDashboardHost;
}

const tab = (
	key: ServiceDetailsTab,
	label: string,
	name: string,
): ServiceDetailsTabConfig => ({
	key,
	label,
	dashboardId: name,
	host: createSystemDashboardHost(name, name),
});

export const SERVICE_DETAILS_TABS: ServiceDetailsTabConfig[] = [
	tab(ServiceDetailsTab.Overview, 'Overview', 'services-overview'),
	tab(ServiceDetailsTab.DbCalls, 'DB Call Metrics', 'services-db-calls'),
	tab(
		ServiceDetailsTab.ExternalCalls,
		'External Metrics',
		'services-external-calls',
	),
];

/** The page owns the header; the dashboard keeps its toolbar, whose variables are the filters. */
export const SERVICE_DASHBOARD_CONTROLS: DashboardControlsInput = EMBEDDED;
