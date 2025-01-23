import './CeleryTaskDetail.style.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Divider, Drawer, Typography } from 'antd';
import { QueryParams } from 'constants/query';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';

import CeleryTaskGraph from '../CeleryTaskGraph/CeleryTaskGraph';

export type CeleryTaskData = {
	entity: string;
	value: string | number;
	timeRange: [number, number];
};

export type CeleryTaskDetailProps = {
	onClose: () => void;
	mainTitle: string;
	widgetData: Widgets;
	taskData: CeleryTaskData;
	drawerOpen: boolean;
};

export default function CeleryTaskDetail({
	mainTitle,
	widgetData,
	taskData,
	onClose,
	drawerOpen,
}: CeleryTaskDetailProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const shouldShowDrawer =
		!!taskData.entity && !!taskData.timeRange[0] && drawerOpen;

	const formatTimestamp = (timestamp: number): string =>
		dayjs(timestamp * 1000).format('MM-DD-YYYY hh:mm A');

	const [totalTask, setTotalTask] = useState(0);

	const getGraphData = (graphData?: MetricRangePayloadProps['data']): void => {
		console.log(graphData);
		setTotalTask((graphData?.result?.[0] as any)?.table?.rows.length);
	};

	// set time range
	const { minTime, maxTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const startTime = taskData.timeRange[0];
	const endTime = taskData.timeRange[1];

	const urlQuery = useUrlQuery();
	const location = useLocation();
	const history = useHistory();
	const dispatch = useDispatch();

	useEffect(() => {
		urlQuery.delete(QueryParams.relativeTime);
		urlQuery.set(QueryParams.startTime, startTime.toString());
		urlQuery.set(QueryParams.endTime, endTime.toString());

		const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
		history.replace(generatedUrl);

		if (startTime !== endTime) {
			dispatch(UpdateTimeInterval('custom', [startTime, endTime]));
		}

		return (): void => {
			urlQuery.delete(QueryParams.relativeTime);
			urlQuery.delete(QueryParams.startTime);
			urlQuery.delete(QueryParams.endTime);

			if (selectedTime !== 'custom') {
				dispatch(UpdateTimeInterval(selectedTime));
				urlQuery.set(QueryParams.relativeTime, selectedTime);
			} else {
				dispatch(UpdateTimeInterval('custom', [minTime / 1e6, maxTime / 1e6]));
				urlQuery.set(QueryParams.startTime, Math.floor(minTime / 1e6).toString());
				urlQuery.set(QueryParams.endTime, Math.floor(maxTime / 1e6).toString());
			}

			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.replace(generatedUrl);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Drawer
			width="45%"
			title={
				<div>
					<Typography.Text className="title">{mainTitle}</Typography.Text>
					<div>
						<Typography.Text className="subtitle">
							{`${formatTimestamp(taskData.timeRange[0])} ${
								taskData.timeRange[1]
									? `- ${formatTimestamp(taskData.timeRange[1])}`
									: ''
							}`}
						</Typography.Text>
						<Divider type="vertical" />
						<Typography.Text className="subtitle">task-details</Typography.Text>
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
				onClick={(): void => {}}
				getGraphData={getGraphData}
				queryEnabled
			/>
		</Drawer>
	);
}
