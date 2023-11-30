import { Button } from 'antd';
import {
	initialQueriesMap,
	OPERATORS,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ExplorerOrderBy from 'container/ExplorerOrderBy';
import { QueryBuilder } from 'container/QueryBuilder';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { ButtonWrapperStyled } from 'pages/LogsExplorer/styles';
import { prepareQueryWithDefaultTimestamp } from 'pages/LogsExplorer/utils';
import { memo, useCallback, useMemo } from 'react';
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
		const isList = panelTypes === PANEL_TYPES.LIST;
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: isTable, isDisabled: true },
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
		<QueryBuilder
			panelType={panelTypes}
			config={{ initialDataSource: DataSource.LOGS, queryVariant: 'static' }}
			filterConfigs={filterConfigs}
			queryComponents={queryComponents}
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
