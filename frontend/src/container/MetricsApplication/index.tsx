import { Tabs } from 'antd';
import React from 'react';
import { Widgets } from 'types/api/dashboard/getAll';

import ResourceAttributesFilter from './ResourceAttributesFilter';
import Application from './Tabs/Application';
import DBCall from './Tabs/DBCall';
import External from './Tabs/External';

const { TabPane } = Tabs;

function ServiceMetrics(): JSX.Element {
	const getWidget = (query: Widgets['query']): Widgets => {
		return {
			description: '',
			id: '',
			isStacked: false,
			nullZeroValues: '',
			opacity: '0',
			panelTypes: 'TIME_SERIES',
			query,
			queryData: {
				data: [],
				error: false,
				errorMessage: '',
				loading: false,
			},
			timePreferance: 'GLOBAL_TIME',
			title: '',
			stepSize: 60,
		};
	};

	return (
		<>
			<ResourceAttributesFilter />
			<Tabs defaultActiveKey="1">
				<TabPane animated destroyInactiveTabPane tab="Application Metrics" key="1">
					<Application getWidget={getWidget} />
				</TabPane>

				<TabPane animated destroyInactiveTabPane tab="External Calls" key="2">
					<External getWidget={getWidget} />
				</TabPane>

				<TabPane animated destroyInactiveTabPane tab="Database Calls" key="3">
					<DBCall getWidget={getWidget} />
				</TabPane>
			</Tabs>
		</>
	);
}

export default ServiceMetrics;
