import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ExplorerOrderBy from 'container/ExplorerOrderBy';
import { OrderByFilterProps } from 'container/QueryBuilder/filters/OrderByFilter/OrderByFilter.interfaces';
import {
	QueryBuilderProps,
	TraceView,
} from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo, useCallback, useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

function QuerySection({
	onChangeTraceView = (): void => {},
}: {
	onChangeTraceView?: (view: TraceView) => void;
}): JSX.Element {
	const { removeAllQueryBuilderEntities } = useQueryBuilder();
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

	const isListViewPanel = useMemo(
		() => panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE,
		[panelTypes],
	);

	const handleChangeTraceView = useCallback(
		(view: TraceView) => {
			if (isListViewPanel) {
				removeAllQueryBuilderEntities('queryFormulas');
			} else {
				if (view === TraceView.SPANS) {
					removeAllQueryBuilderEntities('queryTraceOperator');
				} else {
					removeAllQueryBuilderEntities('queryFormulas');
				}
			}
			onChangeTraceView(view);
		},
		[onChangeTraceView, isListViewPanel, removeAllQueryBuilderEntities],
	);

	return (
		<QueryBuilderV2
			isListViewPanel={
				panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE
			}
			showTraceViewSelector
			onChangeTraceView={handleChangeTraceView}
			config={{ initialDataSource: DataSource.TRACES, queryVariant: 'static' }}
			queryComponents={queryComponents}
			panelType={panelTypes}
			filterConfigs={filterConfigs}
			showOnlyWhereClause={
				panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE
			}
			version="v3" // setting this to v3 as we this is rendered in logs explorer
		/>
	);
}

export default memo(QuerySection);
