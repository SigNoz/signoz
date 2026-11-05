import { useMemo } from 'react';
import AddToDashboardButton from 'container/ExplorerActions/AddToDashboardButton';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DataSource } from 'types/common/queryBuilder';

import { AI_EXPLORER_ACTION_EVENTS, DEFAULT_PANEL_TYPE } from '../constants';
import { getExportQuery } from '../explorerUtils';

function AIExplorerActions(): JSX.Element {
	const { stagedQuery, panelType } = useQueryBuilder();

	const query = useMemo(
		() =>
			stagedQuery
				? getExportQuery(stagedQuery, panelType || DEFAULT_PANEL_TYPE)
				: null,
		[stagedQuery, panelType],
	);
	//TODO: Make sure this support the refactor Abhi is doing + We also need to add support for Alerts

	return (
		<AddToDashboardButton
			query={query}
			sourcepage={DataSource.TRACES}
			events={AI_EXPLORER_ACTION_EVENTS}
		/>
	);
}

export default AIExplorerActions;
