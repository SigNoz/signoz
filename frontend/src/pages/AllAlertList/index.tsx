import React from 'react';
import ListAlerts from 'container/ListAlerts';
import { Tabs } from 'antd';
const { TabPane } = Tabs;

const AllAlertList = () => {
	return (
		<Tabs defaultActiveKey="All Alerts">
			<TabPane tabKey="All Alerts" tab="All Alerts" key="All Alerts">
				<ListAlerts />
			</TabPane>
			<TabPane
				tabKey="Alert Groups"
				key="Alert Groups"
				tab="Alert Groups"
			></TabPane>
			<TabPane tabKey="Silences" key="Silences" tab="Silences"></TabPane>
		</Tabs>
	);
};

export default AllAlertList;
