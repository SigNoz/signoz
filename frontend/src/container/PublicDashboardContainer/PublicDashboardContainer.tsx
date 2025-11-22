import './PublicDashboardContainer.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Typography } from 'antd';
import cx from 'classnames';
import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { Card, CardContainer } from 'container/GridCardLayout/styles';
import { WidgetRowHeader } from 'container/GridCardLayout/WidgetRow';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs from 'dayjs';
import { useGetPublicDashboardData } from 'hooks/dashboard/useGetPublicDashboardData';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import RGL, { Layout, WidthProvider } from 'react-grid-layout';
import { useParams } from 'react-router-dom';
import { Widgets } from 'types/api/dashboard/getAll';

import Panel from './Panel';

const ReactGridLayoutComponent = WidthProvider(RGL);

function PublicDashboardContainer(): JSX.Element {
	// read the dashboard id from the url
	const { dashboardId } = useParams<{ dashboardId: string }>();
	const isDarkMode = useIsDarkMode();

	console.log('dashboardId', dashboardId);

	const {
		data: publicDashboardData,
		isLoading: isLoadingPublicDashboardData,
	} = useGetPublicDashboardData(dashboardId || '');

	const { dashboard } = publicDashboardData?.data || {};
	const { widgets } = dashboard?.data || {};
	const defaultTimeRange = 30 as number;

	// Memoize startTime and endTime to prevent unnecessary re-renders
	const { startTime, endTime } = useMemo(() => {
		const start = dayjs().subtract(defaultTimeRange, 'minutes').unix();
		const end = dayjs().unix();
		return { startTime: start, endTime: end };
	}, [defaultTimeRange]);

	console.log('startTime', startTime);
	console.log('endTime', endTime);

	// Memoize dashboardLayout to prevent array recreation on every render
	const dashboardLayout = useMemo(() => dashboard?.data?.layout || [], [
		dashboard?.data?.layout,
	]);

	// Memoize widgets map for O(1) lookup and stable references
	const widgetsMap = useMemo(() => {
		if (!widgets) return new Map<string, Widgets>();
		return new Map(widgets.map((widget) => [widget.id, widget]));
	}, [widgets]);

	const [currentPanelMap, setCurrentPanelMap] = useState<
		Record<string, { widgets: Layout[]; collapsed: boolean }>
	>({});

	console.log('publicDashboardData', publicDashboardData);
	console.log('isLoadingPublicDashboardData', isLoadingPublicDashboardData);

	const handleRowCollapse = useCallback((id: string): void => {
		console.log('handleRowCollapse id', id);
	}, []);

	useEffect(() => {
		setCurrentPanelMap(dashboard?.data?.panelMap || {});
	}, [dashboard?.data?.panelMap]);

	const handleTimeRangeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			console.log('handleTimeRangeChange interval', interval);
			console.log('handleTimeRangeChange dateTimeRange', dateTimeRange);
		},
		[],
	);

	return (
		<div className="public-dashboard-container">
			<div className="public-dashboard-header">
				<div className="public-dashboard-header-left">
					<div className="brand-logo">
						<img
							src="/Logos/signoz-brand-logo.svg"
							alt="SigNoz"
							className="brand-logo-img"
						/>

						<Typography className="brand-logo-name">SigNoz</Typography>
					</div>
				</div>

				<div className="public-dashboard-header-right">
					<div className="datetime-section">
						<DateTimeSelectionV2
							showAutoRefresh
							showRefreshText={false}
							hideShareModal
							defaultRelativeTime="30m"
							onTimeChange={handleTimeRangeChange}
						/>
					</div>
				</div>
			</div>

			<div className="public-dashboard-content fullscreen-grid-container">
				<ReactGridLayoutComponent
					cols={12}
					rowHeight={45}
					autoSize
					width={100}
					useCSSTransforms
					isDraggable={false}
					isDroppable={false}
					isResizable={false}
					allowOverlap={false}
					layout={dashboardLayout}
					style={{ backgroundColor: isDarkMode ? '' : themeColors.snowWhite }}
				>
					{dashboardLayout.map((layout, index) => {
						const { i: id } = layout;
						const currentWidget = widgetsMap.get(id);

						if (currentWidget?.panelTypes === PANEL_GROUP_TYPES.ROW) {
							const rowWidgetProperties = currentPanelMap[id] || {};
							let { title } = currentWidget;
							if (rowWidgetProperties.collapsed) {
								const widgetCount = rowWidgetProperties.widgets?.length || 0;
								const collapsedText = `(${widgetCount} widget${
									widgetCount > 1 ? 's' : ''
								})`;
								title += ` ${collapsedText}`;
							}

							return (
								<CardContainer
									isDarkMode={isDarkMode}
									className="row-card"
									key={id}
									data-grid={JSON.stringify(currentWidget)}
								>
									<div className={cx('row-panel')}>
										<div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
											{rowWidgetProperties.collapsed && (
												<GripVertical
													size={14}
													className="drag-handle"
													color={isDarkMode ? Color.BG_VANILLA_100 : Color.BG_INK_300}
													cursor="move"
												/>
											)}
											<Typography.Text className="section-title">{title}</Typography.Text>
											{rowWidgetProperties.collapsed ? (
												<ChevronDown
													size={14}
													onClick={(): void => handleRowCollapse(id)}
													className="row-icon"
												/>
											) : (
												<ChevronUp
													size={14}
													onClick={(): void => handleRowCollapse(id)}
													className="row-icon"
												/>
											)}
										</div>
										<WidgetRowHeader
											id={id}
											rowWidgetProperties={rowWidgetProperties}
											editWidget={false}
											deleteWidget={false}
											setCurrentSelectRowId={(): void => {}}
											setIsDeleteModalOpen={(): void => {}}
											setIsSettingsModalOpen={(): void => {}}
										/>
									</div>
								</CardContainer>
							);
						}

						return (
							<CardContainer
								isDarkMode={isDarkMode}
								key={id}
								data-grid={JSON.stringify(currentWidget)}
							>
								<Card
									className="grid-item"
									isDarkMode={isDarkMode}
									$panelType={currentWidget?.panelTypes || PANEL_TYPES.TIME_SERIES}
								>
									<Panel
										key={id}
										dashboardId={dashboardId}
										widget={(currentWidget as Widgets) || ({ id, query: {} } as Widgets)}
										index={index}
										startTime={startTime}
										endTime={endTime}
									/>
								</Card>
							</CardContainer>
						);
					})}
				</ReactGridLayoutComponent>
			</div>
		</div>
	);
}

export default PublicDashboardContainer;
