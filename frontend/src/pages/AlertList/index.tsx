import { Tabs } from 'antd';
import ListAlertRules from 'container/ListAlertRules';
// import MapAlertChannels from 'container/MapAlertChannels';
import TriggeredAlerts from 'container/TriggeredAlerts';
import React from 'react';
const { TabPane } = Tabs;

const AllAlertList = (): JSX.Element => {
	return (
		<Tabs defaultActiveKey="Alert Rules">
			<TabPane tabKey="Alert Rules" tab="Alert Rules" key="Alert Rules">
				<ListAlertRules />
			</TabPane>

			<TabPane
				tabKey="Triggered Alerts"
				key="Triggered Alerts"
				tab="Triggered Alerts"
			>
				<TriggeredAlerts />
			</TabPane>

			{/* <TabPane
				tabKey="Map Alert Channels"
				key="Map Alert Channels"
				tab="Map Alert Channels"
			>
				<MapAlertChannels />
			</TabPane> */}
		</Tabs>
	);
};

export default AllAlertList;
