import { Tabs } from 'antd';
import AllAlertRules from 'container/ListAlertRules';
// import MapAlertChannels from 'container/MapAlertChannels';
import TriggeredAlerts from 'container/TriggeredAlerts';
import React from 'react';

function AllAlertList(): JSX.Element {
	const items = [
		{ label: 'Alert Rules', key: 'Alert Rules', children: <AllAlertRules /> },
		{
			label: 'Triggered Alerts',
			key: 'Triggered Alerts',
			children: <TriggeredAlerts />,
		},
		// {
		// 	label: 'Map Alert Channels',
		// 	key = 'Map Alert Channels',
		// 	children: <MapAlertChannels />,
		// },
	];

	return (
		<Tabs destroyInactiveTabPane defaultActiveKey="Alert Rules" items={items} />
	);
}

export default AllAlertList;
