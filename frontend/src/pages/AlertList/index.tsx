import './AlertList.styles.scss';

import { Tabs } from 'antd';
import { TabsProps } from 'antd/lib';
import ConfigureIcon from 'assets/AlertHistory/ConfigureIcon';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import ROUTES from 'constants/routes';
import AllAlertRules from 'container/ListAlertRules';
import { PlannedDowntime } from 'container/PlannedDowntime/PlannedDowntime';
import RoutingPolicies from 'container/RoutingPolicies';
import TriggeredAlerts from 'container/TriggeredAlerts';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { GalleryVerticalEnd, Pyramid } from 'lucide-react';
import AlertDetails from 'pages/AlertDetails';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

function AllAlertList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const tab = urlQuery.get('tab');
	const isAlertHistory = location.pathname === ROUTES.ALERT_HISTORY;
	const isAlertOverview = location.pathname === ROUTES.ALERT_OVERVIEW;

	const search = urlQuery.get('search');

	const configurationTab = useMemo(() => {
		const tabs = [
			{
				label: 'Planned Downtime',
				key: 'planned-downtime',
				children: <PlannedDowntime />,
			},
			{
				label: 'Routing Policies',
				key: 'routing-policies',
				children: <RoutingPolicies />,
			},
		];
		return (
			<Tabs
				className="configuration-tabs"
				defaultActiveKey="planned-downtime"
				items={tabs}
			/>
		);
	}, []);

	const items: TabsProps['items'] = [
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<GalleryVerticalEnd size={14} />
					Triggered Alerts
				</div>
			),
			key: 'TriggeredAlerts',
			children: <TriggeredAlerts />,
		},
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<Pyramid size={14} />
					Alert Rules
				</div>
			),
			key: 'AlertRules',
			children: (
				<div className="alert-rules-container">
					{isAlertHistory || isAlertOverview ? <AlertDetails /> : <AllAlertRules />}
				</div>
			),
		},
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<ConfigureIcon width={14} height={14} />
					Configuration
				</div>
			),
			key: 'Configuration',
			children: configurationTab,
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
			className={`alerts-container ${
				isAlertHistory || isAlertOverview ? 'alert-details-tabs' : ''
			}`}
			tabBarExtraContent={
				<HeaderRightSection
					enableAnnouncements={false}
					enableShare
					enableFeedback
				/>
			}
		/>
	);
}

export default AllAlertList;
