import { Tabs } from 'antd';
import { TabsProps } from 'antd/lib';
import ConfigureIcon from 'assets/AlertHistory/ConfigureIcon';
import ROUTES from 'constants/routes';
import AllAlertRules from 'container/ListAlertRules';
import { PlannedDowntime } from 'container/PlannedDowntime/PlannedDowntime';
import TriggeredAlerts from 'container/TriggeredAlerts';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { GalleryVerticalEnd, Pyramid } from 'lucide-react';
import AlertDetails from 'pages/AlertDetails';
import { useLocation } from 'react-router-dom';

function AllAlertList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();

	const tab = urlQuery.get('tab');
	const isAlertHistory = location.pathname === ROUTES.ALERT_HISTORY;
	const isAlertOverview = location.pathname === ROUTES.ALERT_OVERVIEW;

	const items: TabsProps['items'] = [
		{
			label: (
				<div className="periscope-tab">
					<GalleryVerticalEnd size={14} />
					Triggered Alerts
				</div>
			),
			key: 'TriggeredAlerts',
			children: <TriggeredAlerts />,
		},
		{
			label: (
				<div className="periscope-tab">
					<Pyramid size={14} />
					Alert Rules
				</div>
			),
			key: 'AlertRules',
			children:
				isAlertHistory || isAlertOverview ? <AlertDetails /> : <AllAlertRules />,
		},
		{
			label: (
				<div className="periscope-tab">
					<ConfigureIcon />
					Configuration
				</div>
			),
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
				history.replace(`/alerts?${urlQuery.toString()}`);
			}}
			className={`${
				isAlertHistory || isAlertOverview ? 'alert-details-tabs' : ''
			}`}
		/>
	);
}

export default AllAlertList;
