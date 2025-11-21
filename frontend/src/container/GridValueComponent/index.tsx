import { Typography } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import ValueGraph from 'components/ValueGraph';
import { generateGridTitle } from 'container/GridPanelSwitch/utils';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import ContextMenu, { useCoordinates } from 'periscope/components/ContextMenu';
import { memo, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { EQueryType } from 'types/common/dashboard';

import { TitleContainer, ValueContainer } from './styles';
import { GridValueComponentProps } from './types';

function GridValueComponent({
	data,
	title,
	yAxisUnit,
	thresholds,
	widget,
	queryResponse,
	contextLinks,
	enableDrillDown = false,
}: GridValueComponentProps): JSX.Element {
	const value = ((data[1] || [])[0] || 0) as number;

	const location = useLocation();
	const gridTitle = useMemo(() => generateGridTitle(title), [title]);

	const isDashboardPage = location.pathname.split('/').length === 3;

	const {
		coordinates,
		popoverPosition,
		onClose,
		onClick,
		subMenu,
		setSubMenu,
		clickedData,
	} = useCoordinates();

	const { menuItemsConfig } = useGraphContextMenu({
		widgetId: widget?.id || '',
		query: widget?.query || {
			queryType: EQueryType.QUERY_BUILDER,
			promql: [],
			builder: {
				queryFormulas: [],
				queryData: [],
				queryTraceOperator: [],
			},
			clickhouse_sql: [],
			id: '',
		},
		graphData: clickedData,
		onClose,
		coordinates,
		subMenu,
		setSubMenu,
		contextLinks: contextLinks || { linksData: [] },
		panelType: widget?.panelTypes,
		queryRange: queryResponse,
	});

	if (data.length === 0) {
		return (
			<ValueContainer>
				<Typography>No Data</Typography>
			</ValueContainer>
		);
	}

	const isQueryTypeBuilder =
		widget?.query?.queryType === EQueryType.QUERY_BUILDER;

	return (
		<>
			<TitleContainer isDashboardPage={isDashboardPage}>
				<Typography>{gridTitle}</Typography>
			</TitleContainer>
			<ValueContainer
				showClickable={enableDrillDown && isQueryTypeBuilder}
				onClick={(e): void => {
					const queryName = (queryResponse?.data?.params as any)?.compositeQuery
						?.queries[0]?.spec?.name;

					if (!enableDrillDown || !queryName || !isQueryTypeBuilder) return;

					// when multiple queries are present, we need to get the query name from the queryResponse
					// since value panel shows result for the first query
					const clickedData = {
						queryName,
						filters: [],
					};
					onClick({ x: e.clientX, y: e.clientY }, clickedData);
				}}
			>
				<ValueGraph
					thresholds={thresholds || []}
					rawValue={value}
					value={
						yAxisUnit
							? getYAxisFormattedValue(
									String(value),
									yAxisUnit,
									widget?.decimalPrecision,
							  )
							: value.toString()
					}
				/>
			</ValueContainer>
			<ContextMenu
				coordinates={coordinates}
				popoverPosition={popoverPosition}
				title={menuItemsConfig.header as string}
				items={menuItemsConfig.items}
				onClose={onClose}
			/>
		</>
	);
}

export default memo(GridValueComponent);
