import { useEffect, useState } from 'react';
import { useQueryState } from 'nuqs';
import SystemDashboard from 'container/SystemDashboard/SystemDashboard';
import { variablesUrlParser } from 'pages/DashboardPage/DashboardContainer/VariablesBar/utils/variablesUrlState';
import type { SelectedVariableValue } from 'pages/DashboardPage/DashboardContainer/VariablesBar/selectionTypes';

import { useFollowServiceSelection } from '../../hooks/useFollowServiceSelection';
import {
	SERVICE_DASHBOARD_CONTROLS,
	type ServiceDetailsTabConfig,
} from '../../serviceDetailsTabs';

interface ServiceDashboardProps {
	tab: ServiceDetailsTabConfig;
	serviceName: string;
	variables: Record<string, SelectedVariableValue>;
}

/**
 * One tab's system dashboard, seeded with the page's variables. The dashboard
 * reads `?variables=` once when it mounts, so the page writes it first and
 * remounts this (by key) whenever the values change.
 */
function ServiceDashboard({
	tab,
	serviceName,
	variables,
}: ServiceDashboardProps): JSX.Element | null {
	const [, setUrlVariables] = useQueryState(
		'variables',
		variablesUrlParser.withOptions({ history: 'replace' }),
	);
	const [isSeeded, setIsSeeded] = useState(false);
	useFollowServiceSelection(tab.dashboardId, serviceName);

	useEffect(() => {
		void setUrlVariables(variables).then(() => setIsSeeded(true));
		// eslint-disable-next-line react-hooks/exhaustive-deps -- seeds once per mount; the parent keys this by the values
	}, []);

	// One tick: the URL write lands before the dashboard reads it.
	if (!isSeeded) {
		return null;
	}

	return (
		<SystemDashboard host={tab.host} controls={SERVICE_DASHBOARD_CONTROLS} />
	);
}

export default ServiceDashboard;
