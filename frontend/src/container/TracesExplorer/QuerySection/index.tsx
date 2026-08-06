import { memo, useCallback, useMemo } from 'react';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOrderBy from 'container/ExplorerOrderBy';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useIsAIQueryDemo } from 'container/TracesExplorer/useIsAIQueryDemo';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { DataSource } from 'types/common/queryBuilder';

function QuerySection(): JSX.Element {
	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);
	const isAIQueryDemo = useIsAIQueryDemo();

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

	const isListViewPanel = useMemo(
		() => panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE,
		[panelTypes],
	);

	return (
		<QueryBuilderV2
			isListViewPanel={isListViewPanel}
			showTraceOperator
			config={{ initialDataSource: DataSource.TRACES, queryVariant: 'static' }}
			queryComponents={queryComponents}
			panelType={panelTypes}
			filterConfigs={filterConfigs}
			// DEMO: in AI mode, List/Trace hide the span-scope select and suggestions
			// are scoped to the gen_ai key set. Both are no-ops without ?aiDemo=1.
			showSpanScopeSelector={!isAIQueryDemo || !isListViewPanel}
			fieldKeysQueryType={isAIQueryDemo ? 'builder_ai_query' : undefined}
			showOnlyWhereClause={
				panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE
			}
			version="v3" // setting this to v3 as we this is rendered in logs explorer
		/>
	);
}

export default memo(QuerySection);
