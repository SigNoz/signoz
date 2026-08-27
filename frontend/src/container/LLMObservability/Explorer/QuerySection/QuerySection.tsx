import { memo, useMemo } from 'react';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { DataSource } from 'types/common/queryBuilder';

import { DEFAULT_PANEL_TYPE } from '../constants';

function QuerySection(): JSX.Element {
	const panelTypes = useGetPanelTypesQueryParam(DEFAULT_PANEL_TYPE);

	// Reaches the builder only for timeseries/table; list and trace use listViewTracesFilterConfigs.
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
			config={{ initialDataSource: DataSource.TRACES, queryVariant: 'static' }}
			panelType={panelTypes}
			filterConfigs={filterConfigs}
			showOnlyWhereClause={isListViewPanel}
			version="v3" // setting this to v3 as we this is rendered in logs explorer
		/>
	);
}

export default memo(QuerySection);
