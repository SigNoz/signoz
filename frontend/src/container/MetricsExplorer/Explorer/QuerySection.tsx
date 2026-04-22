import { useCallback } from 'react';
import { useIsFetching, useQueryClient } from 'react-query';
import logEvent from 'api/common/logEvent';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { QueryBuilder } from 'container/QueryBuilder';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { ButtonWrapper } from 'container/TracesExplorer/QuerySection/styles';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { DataSource } from 'types/common/queryBuilder';

import { MetricsExplorerEventKeys, MetricsExplorerEvents } from '../events';

function QuerySection(): JSX.Element {
	const { handleRunQuery } = useQueryBuilder();
	const queryClient = useQueryClient();

	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.TIME_SERIES);

	const isLoadingQueries = useIsFetching([REACT_QUERY_KEY.GET_QUERY_RANGE]) > 0;

	const handleCancelQuery = useCallback(() => {
		queryClient.cancelQueries([REACT_QUERY_KEY.GET_QUERY_RANGE]);
	}, [queryClient]);

	return (
		<div className="query-section">
			<QueryBuilder
				panelType={panelTypes}
				config={{ initialDataSource: DataSource.METRICS, queryVariant: 'static' }}
				version="v4"
				actions={
					<ButtonWrapper>
						<RunQueryBtn
							onStageRunQuery={(): void => {
								handleRunQuery();
								logEvent(MetricsExplorerEvents.QueryBuilderQueryChanged, {
									[MetricsExplorerEventKeys.Tab]: 'explorer',
								});
							}}
							isLoadingQueries={isLoadingQueries}
							handleCancelQuery={handleCancelQuery}
						/>
					</ButtonWrapper>
				}
			/>
		</div>
	);
}

export default QuerySection;
