/* eslint-disable no-nested-ternary */
import './CeleryTaskGraph.style.scss';

import { Col, Row } from 'antd';
import { Dispatch, SetStateAction } from 'react';

import {
	celeryAllStateCountWidgetData,
	celeryFailedStateCountWidgetData,
	celeryRetryStateCountWidgetData,
	celerySuccessStateCountWidgetData,
} from './CeleryTaskGraphUtils';
import { useGetValueFromWidget } from './useGetValueFromWidget';

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
	barState,
	setBarState,
}: {
	setBarState: Dispatch<SetStateAction<CeleryTaskState>>;
	barState: CeleryTaskState;
}): JSX.Element {
	const tabs: TabData[] = [
		{ label: 'All Tasks', key: CeleryTaskState.All },
		{ label: 'Failed', key: CeleryTaskState.Failed },
		{ label: 'Retry', key: CeleryTaskState.Retry },
		{ label: 'Successful', key: CeleryTaskState.Successful },
	];

	const handleTabClick = (key: CeleryTaskState): void => {
		setBarState(key as CeleryTaskState);
	};

	const { values, isLoading, isError } = useGetValueFromWidget(
		[
			celeryAllStateCountWidgetData,
			celeryFailedStateCountWidgetData,
			celeryRetryStateCountWidgetData,
			celerySuccessStateCountWidgetData,
		],
		['celery-task-states'],
	);

	return (
		<Row className="celery-task-states">
			{tabs.map((tab, index) => (
				<Col
					key={tab.key}
					onClick={(): void => handleTabClick(tab.key as CeleryTaskState)}
					className={`celery-task-states__tab ${
						tab.key === barState ? 'celery-task-states__tab--selected' : ''
					}`}
					data-last-tab={index === tabs.length - 1}
				>
					<div className="celery-task-states__label-wrapper">
						<div className="celery-task-states__label">{tab.label}</div>
						<div className="celery-task-states__value">
							{isLoading ? '-' : isError ? '-' : values[index]}
						</div>
					</div>
					{tab.key === barState && <div className="celery-task-states__indicator" />}
				</Col>
			))}
		</Row>
	);
}

export { CeleryTaskStateGraphConfig };
