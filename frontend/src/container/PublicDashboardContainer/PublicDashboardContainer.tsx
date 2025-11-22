import './PublicDashboardContainer.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Typography } from 'antd';
import cx from 'classnames';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import GridCard from 'container/GridCardLayout/GridCard';
import WidgetGraphComponent from 'container/GridCardLayout/GridCard/WidgetGraphComponent';
import { Card, CardContainer } from 'container/GridCardLayout/styles';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import dayjs from 'dayjs';
import { useGetPublicDashboardData } from 'hooks/dashboard/useGetPublicDashboardData';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
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

	const { dashboard, publicDashboard } = publicDashboardData?.data || {};
	const { widgets, variables } = dashboard?.data || {};
	const defaultTimeRange = 30 as number;

	const startTime = dayjs().subtract(defaultTimeRange, 'minutes').unix();
	const endTime = dayjs().unix();

	console.log('startTime', startTime);
	console.log('endTime', endTime);

	const dashboardLayout = dashboard?.data?.layout || [];

	const [currentPanelMap, setCurrentPanelMap] = useState<
		Record<string, { widgets: Layout[]; collapsed: boolean }>
	>({});

	console.log('publicDashboardData', publicDashboardData);
	console.log('isLoadingPublicDashboardData', isLoadingPublicDashboardData);

	const handleRowCollapse = (id: string): void => {
		console.log('handleRowCollapse id', id);
	};

	const handleTimeRangeChange = (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	): void => {
		console.log('handleTimeRangeChange interval', interval);
		console.log('handleTimeRangeChange dateTimeRange', dateTimeRange);
	};

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
						const currentWidget = (widgets || [])?.find((e) => e.id === id);

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
								<div className="row-card" key={id}>
									<div className={cx('row-panel')}>
										<div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
									</div>
								</div>
							);
						}

						return (
							<div key={id}>
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
										{/* <GridCard
											widget={(currentWidget as Widgets) || ({ id, query: {} } as Widgets)}
											headerMenuList={[]}
											variables={variables}
											// version={selectedDashboard?.data?.version}
											version={ENTITY_VERSION_V5}
											enableDrillDown={false}
											widgetsHavingDynamicVariables={undefined}
										/> */}

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
							</div>
						);
					})}
				</ReactGridLayoutComponent>
			</div>
		</div>
	);
}

export default PublicDashboardContainer;
