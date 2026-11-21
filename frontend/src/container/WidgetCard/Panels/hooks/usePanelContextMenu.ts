import { useCallback } from 'react';
import type { UseQueryResult } from 'react-query';
import {
	getTimeRangeFromStepInterval,
	isApmMetric,
} from 'container/WidgetCard/Panels/utils';
import { getUplotClickData } from 'container/QueryTable/Drilldown/drilldownUtils';
import type { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import useGraphContextMenu from 'container/QueryTable/Drilldown/useGraphContextMenu';
import type { PopoverPosition } from 'periscope/components/ContextMenu';
import { useCoordinates } from 'periscope/components/ContextMenu';
import type { Widgets } from 'types/api/widgets/widget';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';

interface UseTimeSeriesContextMenuParams {
	widget: Widgets;
	queryResponse: UseQueryResult<MetricQueryRangeSuccessResponse, Error>;
	enableDrillDown?: boolean;
	onClickHandler?: OnClickPluginOpts['onClick'];
}

export const usePanelContextMenu = ({
	widget,
	queryResponse,
	enableDrillDown = false,
	onClickHandler,
}: UseTimeSeriesContextMenuParams): {
	coordinates: { x: number; y: number } | null;
	popoverPosition: PopoverPosition | null;
	onClose: () => void;
	menuItemsConfig: {
		header?: string | React.ReactNode;
		items?: React.ReactNode;
	};
	clickHandlerWithContextMenu: (...args: any[]) => void;
} => {
	const {
		coordinates,
		popoverPosition,
		clickedData,
		onClose,
		subMenu,
		onClick,
		setSubMenu,
	} = useCoordinates();

	const { menuItemsConfig } = useGraphContextMenu({
		widgetId: widget.id || '',
		query: widget.query,
		graphData: clickedData,
		onClose,
		coordinates,
		subMenu,
		setSubMenu,
		contextLinks: widget.contextLinks,
		panelType: widget.panelTypes,
		queryRange: queryResponse,
	});

	const clickHandlerWithContextMenu = useCallback(
		(...args: any[]) => {
			if (!enableDrillDown) {
				onClickHandler?.(...(args as Parameters<OnClickPluginOpts['onClick']>));
				return;
			}
			const [
				xValue,
				_yvalue,
				_mouseX,
				_mouseY,
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				axesData,
				focusedSeries,
			] = args;

			const data = getUplotClickData({
				metric,
				queryData,
				absoluteMouseX,
				absoluteMouseY,
				focusedSeries,
			});

			let timeRange;

			if (axesData && queryData?.queryName) {
				const compositeQuery = (queryResponse?.data?.params as any)?.compositeQuery;

				if (compositeQuery?.queries) {
					const specificQuery = compositeQuery.queries.find(
						(query: any) => query.spec?.name === queryData.queryName,
					);

					const stepInterval = specificQuery?.spec?.stepInterval || 60;

					timeRange = getTimeRangeFromStepInterval(
						stepInterval,
						metric?.clickedTimestamp || xValue,
						specificQuery?.spec?.signal === DataSource.METRICS &&
							isApmMetric(specificQuery?.spec?.aggregations[0]?.metricName),
					);
				}
			}

			if (data && data?.record?.queryName) {
				onClick(data.coord, {
					...data.record,
					label: data.label,
					seriesColor: data.seriesColor,
					timeRange,
				});
			}
		},
		[enableDrillDown, onClick, onClickHandler, queryResponse],
	);

	return {
		coordinates,
		popoverPosition,
		onClose,
		menuItemsConfig: enableDrillDown ? menuItemsConfig : {},
		clickHandlerWithContextMenu,
	};
};
