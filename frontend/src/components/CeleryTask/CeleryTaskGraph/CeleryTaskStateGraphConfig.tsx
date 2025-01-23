import './CeleryTaskGraph.style.scss';

import { Col, Row } from 'antd';
// import { ENTITY_VERSION_V4 } from 'constants/app';
// import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { Dispatch, SetStateAction } from 'react';
// import { useQueries } from 'react-query';
// import { useSelector } from 'react-redux';
// import { AppState } from 'store/reducers';
// import { SuccessResponse } from 'types/api';
// import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
// import { GlobalReducer } from 'types/reducer/globalTime';

// import { getCeleryTaskStateQueryPayload } from './CeleryTaskGraphUtils';

interface TabData {
	label: string;
	value: number;
	key: string;
}

export enum CeleryTaskState {
	All = 'all',
	Failed = 'failed',
	Retry = 'retry',
	Successful = 'successful',
}

function CeleryTaskStateGraphConfig({
	histogramState,
	setHistogramState,
}: {
	setHistogramState: Dispatch<SetStateAction<CeleryTaskState>>;
	histogramState: CeleryTaskState;
}): JSX.Element {
	const tabs: TabData[] = [
		{ label: 'All Tasks', value: 1097, key: CeleryTaskState.All },
		{ label: 'Failed', value: 11, key: CeleryTaskState.Failed },
		{ label: 'Retry', value: 59, key: CeleryTaskState.Retry },
		{ label: 'Successful', value: 1027, key: CeleryTaskState.Successful },
	];

	// const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
	// 	(state) => state.globalTime,
	// );

	const handleTabClick = (key: CeleryTaskState): void => {
		setHistogramState(key as CeleryTaskState);
	};

	// // get task count from api
	// const queryPayloads = useMemo(
	// 	() =>
	// 		getCeleryTaskStateQueryPayload({
	// 			start: Math.floor(minTime / 1000000000),
	// 			end: Math.floor(maxTime / 1000000000),
	// 		}),
	// 	[minTime, maxTime],
	// );

	// const queries = useQueries(
	// 	queryPayloads.map((payload) => ({
	// 		queryKey: ['host-metrics', payload, ENTITY_VERSION_V4, 'HOST'],
	// 		queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
	// 			GetMetricQueryRange(payload, ENTITY_VERSION_V4),
	// 		enabled: !!payload,
	// 	})),
	// );

	return (
		<Row className="celery-task-states">
			{tabs.map((tab, index) => (
				<Col
					key={tab.key}
					onClick={(): void => handleTabClick(tab.key as CeleryTaskState)}
					className={`celery-task-states__tab ${
						tab.key === histogramState ? 'celery-task-states__tab--selected' : ''
					}`}
					data-last-tab={index === tabs.length - 1}
				>
					<div className="celery-task-states__label-wrapper">
						<div className="celery-task-states__label">{tab.label}</div>
					</div>
					{/* <div className="celery-task-states__value-wrapper">
						<div className="celery-task-states__value">{tab.value}</div>
					</div> */}
					{tab.key === histogramState && (
						<div className="celery-task-states__indicator" />
					)}
				</Col>
			))}
		</Row>
	);
}

export { CeleryTaskStateGraphConfig };
