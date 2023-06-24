import { TabsProps } from 'antd';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PANEL_TYPES_QUERY } from 'constants/queryBuilderQueryNames';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { TabsStyled } from './LogsExplorerViews.styled';

export function LogsExplorerViews(): JSX.Element {
	const location = useLocation();
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const { currentQuery } = useQueryBuilder();

	const panelTypeParams = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);

	const isMultipleQueries = useMemo(
		() =>
			currentQuery.builder.queryData.length > 1 ||
			currentQuery.builder.queryFormulas.length > 0,
		[currentQuery],
	);

	const tabsItems: TabsProps['items'] = useMemo(
		() => [
			{
				label: 'List View',
				key: PANEL_TYPES.LIST,
				disabled: isMultipleQueries,
			},
			{ label: 'TimeSeries', key: PANEL_TYPES.TIME_SERIES },
			{ label: 'Table', key: PANEL_TYPES.TABLE },
		],
		[isMultipleQueries],
	);

	const handleChangeView = useCallback(
		(panelType: string) => {
			urlQuery.set(PANEL_TYPES_QUERY, JSON.stringify(panelType) as GRAPH_TYPES);
			const path = `${location.pathname}?${urlQuery}`;

			history.push(path);
		},
		[history, location, urlQuery],
	);

	const currentTabKey = useMemo(
		() =>
			Object.values(PANEL_TYPES).includes(panelTypeParams)
				? panelTypeParams
				: PANEL_TYPES.LIST,
		[panelTypeParams],
	);

	useEffect(() => {
		if (panelTypeParams === 'list' && isMultipleQueries) {
			handleChangeView(PANEL_TYPES.TIME_SERIES);
		}
	}, [panelTypeParams, isMultipleQueries, handleChangeView]);

	return (
		<div>
			<TabsStyled
				items={tabsItems}
				defaultActiveKey={currentTabKey}
				activeKey={currentTabKey}
				onChange={handleChangeView}
			/>
		</div>
	);
}
