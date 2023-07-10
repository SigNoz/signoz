import { Button } from 'antd';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilder } from 'container/QueryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { ButtonWrapperStyled } from 'pages/LogsExplorer/styles';
import { prepareQueryWithDefaultTimestamp } from 'pages/LogsExplorer/utils';
import { memo, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

function LogExplorerQuerySection(): JSX.Element {
	const { handleRunQuery, updateAllQueriesOperators } = useQueryBuilder();
	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);
	const defaultValue = useMemo(() => {
		const updatedQuery = updateAllQueriesOperators(
			initialQueriesMap.logs,
			PANEL_TYPES.LIST,
			DataSource.LOGS,
		);
		return prepareQueryWithDefaultTimestamp(updatedQuery);
	}, [updateAllQueriesOperators]);

	useShareBuilderUrl(defaultValue);
	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const isTable = panelTypes === PANEL_TYPES.TABLE;
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: isTable, isDisabled: true },
		};

		return config;
	}, [panelTypes]);

	return (
		<QueryBuilder
			panelType={panelTypes}
			config={{ initialDataSource: DataSource.LOGS, queryVariant: 'static' }}
			filterConfigs={filterConfigs}
			actions={
				<ButtonWrapperStyled>
					<Button type="primary" onClick={handleRunQuery}>
						Run Query
					</Button>
				</ButtonWrapperStyled>
			}
		/>
	);
}

export default memo(LogExplorerQuerySection);
