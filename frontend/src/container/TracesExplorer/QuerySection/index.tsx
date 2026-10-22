import { memo, useMemo } from 'react';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { DataSource } from 'types/common/queryBuilder';

function QuerySection(): JSX.Element {
	const panelTypes = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const isRawQuery = useMemo(
		() => panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE,
		[panelTypes],
	);

	return (
		<QueryBuilderV2
			isRawQuery={isRawQuery}
			showTraceOperator
			config={{ initialDataSource: DataSource.TRACES, queryVariant: 'static' }}
			panelType={panelTypes}
			showOnlyWhereClause={
				panelTypes === PANEL_TYPES.LIST || panelTypes === PANEL_TYPES.TRACE
			}
			version="v3" // setting this to v3 as we this is rendered in logs explorer
		/>
	);
}

export default memo(QuerySection);
