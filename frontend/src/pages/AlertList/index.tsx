import { Tabs } from 'antd';
import { TabsProps } from 'antd/lib';
import { FeatureKeys } from 'constants/features';
import AllAlertRules from 'container/ListAlertRules';
import { PlannedDowntime } from 'container/PlannedDowntime/PlannedDowntime';
import TriggeredAlerts from 'container/TriggeredAlerts';
import useFeatureFlags from 'hooks/useFeatureFlag';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { useLocation } from 'react-router-dom';

function AllAlertList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();

	const isPlannedDowntimeEnabled = useFeatureFlags(
		FeatureKeys.PLANNED_MAINTENANCE,
	)?.active;

	const tab = urlQuery.get('tab');
	const items: TabsProps['items'] = [
		{ label: 'Alert Rules', key: 'AlertRules', children: <AllAlertRules /> },
		{
			label: 'Triggered Alerts',
			key: 'TriggeredAlerts',
			children: <TriggeredAlerts />,
		},
		{
			label: isPlannedDowntimeEnabled ? 'Configuration' : '',
			key: 'Configuration',
			children: <PlannedDowntime />,
		},
	];

	return (
		<Tabs
			destroyInactiveTabPane
			items={items}
			activeKey={tab || 'AlertRules'}
			onChange={(tab): void => {
				urlQuery.set('tab', tab);
				history.replace(`${location.pathname}?${urlQuery.toString()}`);
			}}
		/>
	);
}

export default AllAlertList;
