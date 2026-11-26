import { useMemo } from 'react';
import ExplorerActions from 'container/ExplorerActions/ExplorerActions';
import { ExplorerActionsSource } from 'container/ExplorerActions/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';

import { DEFAULT_PANEL_TYPE } from '../constants';
import { getAlertQuery, getExportQuery } from '../explorerUtils';

function AIExplorerActions(): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();
	const activePanelType = panelType || DEFAULT_PANEL_TYPE;

	const alertQuery = useMemo(
		() => (stagedQuery ? getAlertQuery(stagedQuery, activePanelType) : null),
		[stagedQuery, activePanelType],
	);

	const dashboardQuery = useMemo(
		() => (stagedQuery ? getExportQuery(stagedQuery, activePanelType) : null),
		[stagedQuery, activePanelType],
	);

	return (
		<ExplorerActions
			query={alertQuery}
			dashboardQuery={dashboardQuery}
			sourcePage={ExplorerActionsSource.AI_OBSERVABILITY}
		/>
	);
}

export default AIExplorerActions;
