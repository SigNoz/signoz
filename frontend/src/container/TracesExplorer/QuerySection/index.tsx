import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
// import QuerySearch from 'components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOrderBy from 'container/ExplorerOrderBy';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
// import SpanScopeSelector from 'container/QueryBuilder/filters/QueryBuilderSearchV2/SpanScopeSelector';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
// import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useCallback, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { Container } from './styles';

function QuerySection({
	selectedView,
}: {
	selectedView: PANEL_TYPES;
}): JSX.Element {
	// const { currentQuery } = useQueryBuilder();

	// const queryName = currentQuery?.builder?.queryData[0]?.queryName || '';

	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const isList = panelTypes === PANEL_TYPES.LIST;
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: false, isDisabled: false },
			limit: { isHidden: isList, isDisabled: true },
			having: { isHidden: isList, isDisabled: true },
		};

		return config;
	}, [panelTypes]);

	const renderOrderBy = useCallback(
		({ query, onChange }: OrderByFilterProps) => (
			<ExplorerOrderBy query={query} onChange={onChange} />
		),
		[],
	);

	const queryComponents = useMemo((): QueryBuilderProps['queryComponents'] => {
		const shouldRenderCustomOrderBy =
			panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE;

		return {
			...(shouldRenderCustomOrderBy ? { renderOrderBy } : {}),
		};
	}, [panelTypes, renderOrderBy]);

	console.log('query - section - selectedView', selectedView);

	return (
		<Container>
			{/* {(selectedView === 'list' || selectedView === 'trace') && (
				<div className="qb-search-view-container">
					<QuerySearch />

					<div className="traces-search-filter-in">in</div>

					<SpanScopeSelector queryName={queryName} />
				</div>
			)}

			{(selectedView === 'graph' || selectedView === 'table') && ( */}
			<QueryBuilderV2
				isListViewPanel={panelTypes === PANEL_TYPES.LIST}
				config={{ initialDataSource: DataSource.TRACES, queryVariant: 'static' }}
				queryComponents={queryComponents}
				panelType={panelTypes}
				filterConfigs={filterConfigs}
				version="v3" // setting this to v3 as we this is rendered in logs explorer
			/>
			{/* )} */}
		</Container>
	);
}

export default memo(QuerySection);
