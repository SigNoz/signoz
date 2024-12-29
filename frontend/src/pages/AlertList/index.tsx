import { Tabs } from 'antd';
import { TabsProps } from 'antd/lib';
import ConfigureIcon from 'assets/AlertHistory/ConfigureIcon';
import ROUTES from 'constants/routes';
import AllAlertRules from 'container/ListAlertRules';
import { PlannedDowntime } from 'container/PlannedDowntime/PlannedDowntime';
import TriggeredAlerts from 'container/TriggeredAlerts';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { GalleryVerticalEnd, Pyramid } from 'lucide-react';
import AlertDetails from 'pages/AlertDetails';
import { useLocation } from 'react-router-dom';

function AllAlertList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const tab = urlQuery.get('tab');
	const isAlertHistory = location.pathname === ROUTES.ALERT_HISTORY;
	const isAlertOverview = location.pathname === ROUTES.ALERT_OVERVIEW;

	const search = urlQuery.get('search');

	const items: TabsProps['items'] = [
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<GalleryVerticalEnd size={16} />
					Triggered Alerts
				</div>
			),
			key: 'TriggeredAlerts',
			children: <TriggeredAlerts />,
		},
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<Pyramid size={16} />
					Alert Rules
				</div>
			),
			key: 'AlertRules',
			children:
				isAlertHistory || isAlertOverview ? <AlertDetails /> : <AllAlertRules />,
		},
		{
			label: (
				<div className="periscope-tab top-level-tab">
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
				let params = `tab=${tab}`;

				if (search) {
					params += `&search=${search}`;
				}
				safeNavigate(`/alerts?${params}`);
			}}
			className={`${
				isAlertHistory || isAlertOverview ? 'alert-details-tabs' : ''
			}`}
		/>
	);
}

export default AllAlertList;
