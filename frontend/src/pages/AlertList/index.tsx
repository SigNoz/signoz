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
import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const PLANNED_DOWNTIME_SUB_TAB = 'planned-downtime';
const ROUTING_POLICIES_SUB_TAB = 'routing-policies';

function AllAlertList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const tab = urlQuery.get('tab');
	const subTab = urlQuery.get('subTab');
	const isAlertHistory = location.pathname === ROUTES.ALERT_HISTORY;
	const isAlertOverview = location.pathname === ROUTES.ALERT_OVERVIEW;

	const search = urlQuery.get('search');

	const handleConfigurationTabChange = useCallback(
		(subTab: string): void => {
			urlQuery.set('tab', 'Configuration');
			urlQuery.set('subTab', subTab);
			let params = `tab=Configuration&subTab=${subTab}`;
			if (search) {
				params += `&search=${search}`;
			}
			safeNavigate(`/alerts?${params}`);
		},
		[search, safeNavigate, urlQuery],
	);

	const configurationTab = useMemo(() => {
		const tabs = [
			{
				label: 'Planned Downtime',
				key: PLANNED_DOWNTIME_SUB_TAB,
				children: <PlannedDowntime />,
			},
			{
				label: 'Routing Policies',
				key: ROUTING_POLICIES_SUB_TAB,
				children: <RoutingPolicies />,
			},
		];
		return (
			<Tabs
				className="configuration-tabs"
				activeKey={subTab || PLANNED_DOWNTIME_SUB_TAB}
				items={tabs}
				onChange={handleConfigurationTabChange}
			/>
		);
	}, [subTab, handleConfigurationTabChange]);

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

				// If navigating to Configuration tab, set default subTab
				if (tab === 'Configuration') {
					const currentSubTab = subTab || PLANNED_DOWNTIME_SUB_TAB;
					urlQuery.set('subTab', currentSubTab);
					params += `&subTab=${currentSubTab}`;
				} else {
					// Clear subTab when navigating out of Configuration tab
					urlQuery.delete('subTab');
				}

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
