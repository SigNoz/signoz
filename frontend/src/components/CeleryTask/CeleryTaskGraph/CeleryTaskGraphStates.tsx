import './CeleryTaskGraph.style.scss';

import { Col, Row } from 'antd';
import { useState } from 'react';

interface TabData {
	label: string;
	value: number;
	key: string;
}

function CeleryTaskGraphStates(): JSX.Element {
	const [selectedTab, setSelectedTab] = useState<string>('all');

	const tabs: TabData[] = [
		{ label: 'All Tasks', value: 1097, key: 'all' },
		{ label: 'Failed', value: 11, key: 'failed' },
		{ label: 'Pending', value: 59, key: 'pending' },
		{ label: 'Successful', value: 1027, key: 'successful' },
	];

	const handleTabClick = (key: string): void => {
		setSelectedTab(key);
	};

	return (
		<Row className="celery-task-states">
			{tabs.map((tab, index) => (
				<Col
					key={tab.key}
					onClick={(): void => handleTabClick(tab.key)}
					className={`celery-task-states__tab ${
						tab.key === selectedTab ? 'celery-task-states__tab--selected' : ''
					}`}
					data-last-tab={index === tabs.length - 1}
				>
					<div className="celery-task-states__label-wrapper">
						<div className="celery-task-states__label">{tab.label}</div>
					</div>
					<div className="celery-task-states__value-wrapper">
						<div className="celery-task-states__value">{tab.value}</div>
					</div>
					{tab.key === selectedTab && (
						<div className="celery-task-states__indicator" />
					)}
				</Col>
			))}
		</Row>
	);
}

export { CeleryTaskGraphStates };
