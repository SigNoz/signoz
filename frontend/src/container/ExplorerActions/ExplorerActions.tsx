import { PANEL_TYPES } from 'constants/queryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import AddToDashboardButton from './AddToDashboardButton';
import CreateAlertButton from './CreateAlertButton';

function ExplorerActions({
	query,
	dashboardQuery = query,
	sourcepage,
	panelType,
	isOneChartPerQuery,
}: {
	query: Query | null;
	// When the dashboard export differs from the alert one (traces list injects columns).
	dashboardQuery?: Query | null;
	sourcepage: DataSource;
	panelType?: PANEL_TYPES;
	isOneChartPerQuery?: boolean;
}): JSX.Element {
	return (
		<>
			<CreateAlertButton
				query={query}
				sourcepage={sourcepage}
				isOneChartPerQuery={isOneChartPerQuery}
			/>
			<AddToDashboardButton
				query={dashboardQuery}
				sourcepage={sourcepage}
				panelType={panelType}
				isOneChartPerQuery={isOneChartPerQuery}
			/>
		</>
	);
}

export default ExplorerActions;
