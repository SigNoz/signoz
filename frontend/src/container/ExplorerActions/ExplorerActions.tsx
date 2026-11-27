import { PANEL_TYPES } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import AddToDashboardButton from './AddToDashboardButton';
import CreateAlertButton from './CreateAlertButton';
import { ExplorerActionsSource } from './utils';

function ExplorerActions({
	query,
	dashboardQuery = query,
	sourcePage,
	panelType,
	isOneChartPerQuery,
}: {
	query: Query | null;
	// When the dashboard export differs from the alert one (traces list injects columns).
	dashboardQuery?: Query | null;
	sourcePage: ExplorerActionsSource;
	panelType?: PANEL_TYPES;
	isOneChartPerQuery?: boolean;
}): JSX.Element {
	return (
		<>
			<CreateAlertButton
				query={query}
				sourcePage={sourcePage}
				isOneChartPerQuery={isOneChartPerQuery}
			/>
			<AddToDashboardButton
				query={dashboardQuery}
				sourcePage={sourcePage}
				panelType={panelType}
				isOneChartPerQuery={isOneChartPerQuery}
			/>
		</>
	);
}

export default ExplorerActions;
