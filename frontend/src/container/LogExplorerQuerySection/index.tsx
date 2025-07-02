import './LogsExplorerQuerySection.styles.scss';

import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import {
	initialQueriesMap,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ExplorerOrderBy from 'container/ExplorerOrderBy';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { ExplorerViews } from 'pages/LogsExplorer/utils';
import { memo, useCallback, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

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

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const isTable = panelTypes === PANEL_TYPES.TABLE;
		const isList = panelTypes === PANEL_TYPES.LIST;
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: isTable, isDisabled: false },
			having: { isHidden: isList, isDisabled: true },
			filters: {
				customKey: 'body',
				customOp: OPERATORS.CONTAINS,
			},
		};

		return config;
	}, [panelTypes]);

	const renderOrderBy = useCallback(
		({ query, onChange }: OrderByFilterProps): JSX.Element => (
			<ExplorerOrderBy query={query} onChange={onChange} />
		),
		[],
	);

	const queryComponents = useMemo(
		(): QueryBuilderProps['queryComponents'] => ({
			...(panelTypes === PANEL_TYPES.LIST ? { renderOrderBy } : {}),
		}),
		[panelTypes, renderOrderBy],
	);

	return (
		<QueryBuilderV2
			isListViewPanel={panelTypes === PANEL_TYPES.LIST}
			config={{ initialDataSource: DataSource.LOGS, queryVariant: 'static' }}
			panelType={panelTypes}
			filterConfigs={filterConfigs}
			queryComponents={queryComponents}
			showOnlyWhereClause={selectedView === ExplorerViews.LIST}
			version="v3" // setting this to v3 as we this is rendered in logs explorer
		/>
	);
}

export default memo(LogExplorerQuerySection);
