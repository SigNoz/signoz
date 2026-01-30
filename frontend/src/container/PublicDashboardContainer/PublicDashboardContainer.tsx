import { useMemo, useState } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import { Typography } from 'antd';
import cx from 'classnames';
import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { Card, CardContainer } from 'container/GridCardLayout/styles';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import GetMinMax from 'lib/getMinMax';
import { SuccessResponseV2 } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { PublicDashboardDataProps } from 'types/api/dashboard/public/get';

import Panel from './Panel';

import './PublicDashboardContainer.styles.scss';

const ReactGridLayoutComponent = WidthProvider(RGL);

const CUSTOM_TIME_REGEX = /^(\d+)([mhdw])$/;

const getStartTimeAndEndTimeFromTimeRange = (
	timeRange: string,
): { startTime: number; endTime: number } => {
	const isValidFormat = CUSTOM_TIME_REGEX.test(timeRange);

	if (isValidFormat) {
		const match = timeRange.match(CUSTOM_TIME_REGEX) as RegExpMatchArray;

		const timeValue = parseInt(match[1] as string, 10);
		const timeUnit = match[2] as string;

		switch (timeUnit) {
			case 'm':
				return {
					startTime: dayjs().subtract(timeValue, 'minutes').unix(),
					endTime: dayjs().unix(),
				};
			case 'h':
				return {
					startTime: dayjs().subtract(timeValue, 'hours').unix(),
					endTime: dayjs().unix(),
				};
			case 'd':
				return {
					startTime: dayjs().subtract(timeValue, 'days').unix(),
					endTime: dayjs().unix(),
				};
			case 'w':
				return {
					startTime: dayjs().subtract(timeValue, 'weeks').unix(),
					endTime: dayjs().unix(),
				};
			default:
				return { startTime: dayjs().unix(), endTime: dayjs().unix() };
		}
	}

	return {
		startTime: dayjs().subtract(30, 'minutes').unix(),
		endTime: dayjs().unix(),
	};
};

function PublicDashboardContainer({
	publicDashboardId,
	publicDashboardData,
}: {
	publicDashboardId: string;
	publicDashboardData: SuccessResponseV2<PublicDashboardDataProps>;
}): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { dashboard, publicDashboard } = publicDashboardData?.data || {};
	const { widgets } = dashboard?.data || {};

	const [selectedTimeRangeLabel, setSelectedTimeRangeLabel] = useState<string>(
		publicDashboard?.defaultTimeRange || '30m',
	);

	const [selectedTimeRange, setSelectedTimeRange] = useState<{
		startTime: number;
		endTime: number;
	}>(
		getStartTimeAndEndTimeFromTimeRange(
			publicDashboard?.defaultTimeRange || '30m',
		),
	);

	const isTimeRangeEnabled = publicDashboard?.timeRangeEnabled || false;

	// Memoize dashboardLayout to prevent array recreation on every render
	const dashboardLayout = useMemo(() => dashboard?.data?.layout || [], [
		dashboard?.data?.layout,
	]);

	const currentPanelMap = useMemo(() => dashboard?.data?.panelMap || {}, [
		dashboard?.data?.panelMap,
	]);

	const handleTimeChange = (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	): void => {
		if (dateTimeRange) {
			setSelectedTimeRange({
				startTime: Math.floor(dateTimeRange[0] / 1000),
				endTime: Math.floor(dateTimeRange[1] / 1000),
			});
		} else if (interval !== 'custom') {
			const { maxTime, minTime } = GetMinMax(interval);

			setSelectedTimeRange({
				startTime: Math.floor(minTime / 1000000000),
				endTime: Math.floor(maxTime / 1000000000),
			});
		}

		setSelectedTimeRangeLabel(interval as string);
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

					<div className="public-dashboard-header-title">
						<Typography.Text className="public-dashboard-header-title-text">
							{dashboard?.data?.title}
						</Typography.Text>
					</div>
				</div>

				{isTimeRangeEnabled && (
					<div className="public-dashboard-header-right">
						<div className="datetime-section">
							<DateTimeSelectionV2
								showAutoRefresh={false}
								showRefreshText={false}
								hideShareModal
								onTimeChange={handleTimeChange}
								defaultRelativeTime={publicDashboard?.defaultTimeRange as Time}
								isModalTimeSelection
								modalSelectedInterval={selectedTimeRangeLabel as Time}
								disableUrlSync
								showRecentlyUsed={false}
								modalInitialStartTime={selectedTimeRange.startTime * 1000}
								modalInitialEndTime={selectedTimeRange.endTime * 1000}
							/>
						</div>
					</div>
				)}
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
					{dashboardLayout?.map((layout) => {
						const { i: id } = layout;
						const currentWidget = (widgets || [])?.find((e) => e.id === id);
						const currentWidgetIndex = (widgets || [])?.findIndex((e) => e.id === id);

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
											<Typography.Text className="section-title">{title}</Typography.Text>
										</div>
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
										dashboardId={publicDashboardId}
										widget={(currentWidget as Widgets) || ({ id, query: {} } as Widgets)}
										index={currentWidgetIndex}
										startTime={selectedTimeRange.startTime}
										endTime={selectedTimeRange.endTime}
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
