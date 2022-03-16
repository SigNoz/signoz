import { Tabs } from 'antd';
import React from 'react';

import Application from './Tabs/Application';
import DBCall from './Tabs/DBCall';
import External from './Tabs/External';

const { TabPane } = Tabs;

const ServiceMetrics = (): JSX.Element => {
	return (
		<Tabs defaultActiveKey="1">
			<TabPane animated destroyInactiveTabPane tab="Application Metrics" key="1">
				<Application />
			</TabPane>

			<TabPane animated destroyInactiveTabPane tab="External Calls" key="2">
				<External />
			</TabPane>

			<TabPane animated destroyInactiveTabPane tab="Database Calls" key="3">
				<DBCall />
			</TabPane>
		</Tabs>
	);
};

export default ServiceMetrics;
