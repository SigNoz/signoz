import './CeleryTaskGraph.style.scss';

import { Col, Row } from 'antd';
import { Dispatch, SetStateAction } from 'react';

interface TabData {
	label: string;
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
		{ label: 'All Tasks', key: CeleryTaskState.All },
		{ label: 'Failed', key: CeleryTaskState.Failed },
		{ label: 'Retry', key: CeleryTaskState.Retry },
		{ label: 'Successful', key: CeleryTaskState.Successful },
	];

	const handleTabClick = (key: CeleryTaskState): void => {
		setHistogramState(key as CeleryTaskState);
	};

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
					{tab.key === histogramState && (
						<div className="celery-task-states__indicator" />
					)}
				</Col>
			))}
		</Row>
	);
}

export { CeleryTaskStateGraphConfig };
