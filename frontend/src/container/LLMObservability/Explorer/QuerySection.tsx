import { memo, useMemo } from 'react';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { DataSource } from 'types/common/queryBuilder';

/**
 * Query builder for the AI Observability explorer.
 *
 * Trace View and Span List show a single query with only the filter box (D2):
 * no aggregation row, no formulas, no second query, and no trace operator.
 * Time Series and Table get the full builder, since those are the comparison
 * views where multi-query and formulas are wanted.
 */
function QuerySection(): JSX.Element {
	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.TRACE);

	const isSingleQueryView =
		panelTypes === PANEL_TYPES.TRACE || panelTypes === PANEL_TYPES.LIST;

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(
		() => ({
			stepInterval: { isHidden: false, isDisabled: false },
			limit: { isHidden: isSingleQueryView, isDisabled: true },
			having: { isHidden: isSingleQueryView, isDisabled: true },
		}),
		[isSingleQueryView],
	);

	return (
		<QueryBuilderV2
			isListViewPanel={isSingleQueryView}
			config={{ initialDataSource: DataSource.TRACES, queryVariant: 'static' }}
			panelType={panelTypes}
			filterConfigs={filterConfigs}
			showOnlyWhereClause={isSingleQueryView}
			version="v3"
		/>
	);
}

export default memo(QuerySection);
