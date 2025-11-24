import './PublicDashboardContainer.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Select, Typography } from 'antd';
import cx from 'classnames';
import { PANEL_GROUP_TYPES, PANEL_TYPES } from 'constants/queryBuilder';
import { themeColors } from 'constants/theme';
import { Card, CardContainer } from 'container/GridCardLayout/styles';
import { WidgetRowHeader } from 'container/GridCardLayout/WidgetRow';
import { TIME_RANGE_PRESETS_OPTIONS } from 'container/NewDashboard/DashboardSettings/PublicDashboard';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { GripVertical } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import RGL, { Layout, WidthProvider } from 'react-grid-layout';
import { SuccessResponseV2 } from 'types/api';
import { PublicDashboardDataProps } from 'types/api/dashboard/public/get';

import Panel from './Panel';

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

	const [currentPanelMap, setCurrentPanelMap] = useState<
		Record<string, { widgets: Layout[]; collapsed: boolean }>
	>({});

	useEffect(() => {
		setCurrentPanelMap(dashboard?.data?.panelMap || {});
	}, [dashboard?.data?.panelMap]);

	const handleTimeRangeChange = useCallback(
		(selectedTimeRange: string): void => {
			setSelectedTimeRangeLabel(selectedTimeRange);
			setSelectedTimeRange(getStartTimeAndEndTimeFromTimeRange(selectedTimeRange));
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

					<div className="public-dashboard-header-title">
						<Typography.Text className="public-dashboard-header-title-text">
							{dashboard?.data?.title}
						</Typography.Text>
					</div>
				</div>

				{isTimeRangeEnabled && (
					<div className="public-dashboard-header-right">
						<div className="datetime-section">
							<Select
								placeholder="Select default time range"
								options={TIME_RANGE_PRESETS_OPTIONS}
								value={selectedTimeRangeLabel}
								onChange={handleTimeRangeChange}
								className="time-range-select-dropdown"
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
					{widgets?.map((widget, index) => {
						if (widget?.panelTypes === PANEL_GROUP_TYPES.ROW) {
							const rowWidgetProperties = currentPanelMap[widget?.id] || {};
							let { title } = widget;
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
									key={widget?.id}
									data-grid={JSON.stringify(widget)}
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
										</div>
										<WidgetRowHeader
											id={widget?.id}
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
								key={widget?.id}
								data-grid={JSON.stringify(widget)}
							>
								<Card
									className="grid-item"
									isDarkMode={isDarkMode}
									$panelType={widget?.panelTypes || PANEL_TYPES.TIME_SERIES}
								>
									<Panel
										dashboardId={publicDashboardId}
										widget={widget}
										index={index}
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
