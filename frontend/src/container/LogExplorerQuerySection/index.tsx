import { memo, useMemo } from 'react';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { DataSource } from 'types/common/queryBuilder';

import './LogsExplorerQuerySection.styles.scss';

function LogExplorerQuerySection({
	selectedView,
}: {
	selectedView: ExplorerViews;
}): JSX.Element {
	const { updateAllQueriesOperators } = useQueryBuilder();

	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);
	const defaultValue = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap.logs,
				PANEL_TYPES.LIST,
				DataSource.LOGS,
			),
		[updateAllQueriesOperators],
	);

	useShareBuilderUrl({ defaultValue });

	return (
		<QueryBuilderV2
			isRawQuery={panelTypes === PANEL_TYPES.LIST}
			config={{ initialDataSource: DataSource.LOGS, queryVariant: 'static' }}
			panelType={panelTypes}
			showOnlyWhereClause={selectedView === ExplorerViews.LIST}
			version="v3" // setting this to v3 as we this is rendered in logs explorer
		/>
	);
}

export default memo(LogExplorerQuerySection);
