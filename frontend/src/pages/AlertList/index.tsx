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

import { AlertListSubTabs, AlertListTabs } from './types';

function AllAlertList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const tab = urlQuery.get('tab');
	const subTab = urlQuery.get('subTab');
	const isAlertHistory = location.pathname === ROUTES.ALERT_HISTORY;
	const isAlertOverview = location.pathname === ROUTES.ALERT_OVERVIEW;

	const handleConfigurationTabChange = useCallback(
		(subTab: string): void => {
			urlQuery.set('tab', AlertListTabs.CONFIGURATION);
			urlQuery.set('subTab', subTab);
			urlQuery.delete('search');
			safeNavigate(`/alerts?${urlQuery.toString()}`);
		},
		[safeNavigate, urlQuery],
	);

	const configurationTab = useMemo(() => {
		const tabs = [
			{
				label: 'Planned Downtime',
				key: AlertListSubTabs.PLANNED_DOWNTIME,
				children: <PlannedDowntime />,
			},
			{
				label: 'Routing Policies',
				key: AlertListSubTabs.ROUTING_POLICIES,
				children: <RoutingPolicies />,
			},
		];
		return (
			<Tabs
				className="configuration-tabs"
				activeKey={subTab || AlertListSubTabs.PLANNED_DOWNTIME}
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
			key: AlertListTabs.TRIGGERED_ALERTS,
			children: <TriggeredAlerts />,
		},
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<Pyramid size={14} />
					Alert Rules
				</div>
			),
			key: AlertListTabs.ALERT_RULES,
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
			key: AlertListTabs.CONFIGURATION,
			children: configurationTab,
		},
	];

	return (
		<Tabs
			destroyInactiveTabPane
			items={items}
			activeKey={tab || AlertListTabs.ALERT_RULES}
			onChange={(tab): void => {
				urlQuery.set('tab', tab);

				// If navigating to Configuration tab, set default subTab
				if (tab === AlertListTabs.CONFIGURATION) {
					const currentSubTab = subTab || AlertListSubTabs.PLANNED_DOWNTIME;
					urlQuery.set('subTab', currentSubTab);
				} else {
					// Clear subTab when navigating out of Configuration tab
					urlQuery.delete('subTab');
				}

				// Clear search when navigating to any tab
				urlQuery.delete('search');

				safeNavigate(`/alerts?${urlQuery.toString()}`);
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
