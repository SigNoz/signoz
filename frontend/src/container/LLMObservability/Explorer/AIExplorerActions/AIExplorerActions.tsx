import { useMemo } from 'react';
import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerActions from 'container/ExplorerActions/ExplorerActions';
import { ExplorerActionsSource } from 'container/ExplorerActions/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { getAlertQuery, getExportQuery } from '../explorerUtils';

interface AIExplorerActionsProps {
	panelType: PANEL_TYPES;
	selectColumns?: TelemetryFieldKey[];
}

function AIExplorerActions({
	panelType,
	selectColumns,
}: AIExplorerActionsProps): JSX.Element {
	const { stagedQuery } = useQueryBuilder();

	const alertQuery = useMemo(
		() => (stagedQuery ? getAlertQuery(stagedQuery, panelType) : null),
		[stagedQuery, panelType],
	);

	const dashboardQuery = useMemo(
		() =>
			stagedQuery ? getExportQuery(stagedQuery, panelType, selectColumns) : null,
		[stagedQuery, panelType, selectColumns],
	);

	return (
		<ExplorerActions
			query={alertQuery}
			dashboardQuery={dashboardQuery}
			sourcePage={ExplorerActionsSource.AI_OBSERVABILITY_EXPLORER}
		/>
	);
}

export default AIExplorerActions;
