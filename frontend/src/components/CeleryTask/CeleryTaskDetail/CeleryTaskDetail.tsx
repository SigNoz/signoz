import './CeleryTaskDetail.style.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Divider, Drawer, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { PANEL_TYPES } from 'constants/queryBuilder';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { X } from 'lucide-react';
import { useState } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import CeleryTaskGraph from '../CeleryTaskGraph/CeleryTaskGraph';
import { createFiltersFromData } from '../CeleryUtils';
import { useNavigateToTraces } from '../useNavigateToTraces';

export type CeleryTaskData = {
	entity: string;
	value: string | number;
	timeRange: [number, number];
};

export interface CaptureDataProps extends CeleryTaskData {
	widgetData: Widgets;
}

export type CeleryTaskDetailProps = {
	onClose: () => void;
	widgetData: Widgets;
	taskData: CeleryTaskData;
	drawerOpen: boolean;
};

export default function CeleryTaskDetail({
	widgetData,
	taskData,
	onClose,
	drawerOpen,
}: CeleryTaskDetailProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const shouldShowDrawer =
		!!taskData.entity && !!taskData.timeRange[0] && drawerOpen;

	const formatTimestamp = (timestamp: number): string =>
		dayjs(timestamp).format('DD-MM-YYYY hh:mm A');

	const [totalTask, setTotalTask] = useState(0);

	const getGraphData = (graphData?: MetricRangePayloadProps['data']): void => {
		setTotalTask((graphData?.result?.[0] as any)?.table?.rows.length);
	};

	const startTime = taskData.timeRange[0];
	const endTime = taskData.timeRange[1];

	const navigateToTrace = useNavigateToTraces();

	return (
		<Drawer
			width="45%"
			title={
				<div>
					<Typography.Text className="title">{`Details - ${taskData.entity}`}</Typography.Text>
					<div>
						<Typography.Text className="subtitle">
							{`${formatTimestamp(startTime)} ${
								endTime ? `- ${formatTimestamp(endTime)}` : ''
							}`}
						</Typography.Text>
						<Divider type="vertical" />
						<Typography.Text className="subtitle">{taskData.value}</Typography.Text>
					</div>
				</div>
			}
			placement="right"
			onClose={onClose}
			open={shouldShowDrawer}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="celery-task-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
			footer={
				<Typography.Text className="footer-text">{`Total Task: ${totalTask}`}</Typography.Text>
			}
		>
			<CeleryTaskGraph
				widgetData={widgetData}
				getGraphData={getGraphData}
				panelType={PANEL_TYPES.TABLE}
				queryEnabled
				openTracesButton
				onOpenTraceBtnClick={(rowData): void => {
					const filters = createFiltersFromData({
						...rowData,
						[taskData.entity]: taskData.value,
					});
					logEvent('MQ Celery: navigation to trace page', {
						filters,
						startTime,
						endTime,
						source: widgetData.title,
					});
					navigateToTrace(filters, startTime, endTime);
				}}
				start={startTime}
				end={endTime}
			/>
		</Drawer>
	);
}
