import { memo, useMemo } from 'react';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { DataSource } from 'types/common/queryBuilder';

function QuerySection(): JSX.Element {
	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	// Only reaches the builder for timeseries/table; list and trace panels get
	// QueryBuilderV2's own listViewTracesFilterConfigs instead.
	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(
		() => ({
			stepInterval: { isHidden: false, isDisabled: false },
			limit: { isHidden: false, isDisabled: true },
			having: { isHidden: false, isDisabled: true },
		}),
		[],
	);

	const isListViewPanel = useMemo(
		() => panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE,
		[panelTypes],
	);

	return (
		<QueryBuilderV2
			isListViewPanel={isListViewPanel}
			showSpanScopeSelector={false}
			config={{ initialDataSource: DataSource.TRACES, queryVariant: 'static' }}
			panelType={panelTypes}
			filterConfigs={filterConfigs}
			showOnlyWhereClause={isListViewPanel}
			version="v3"
		/>
	);
}

export default memo(QuerySection);
