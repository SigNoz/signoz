import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsProps } from 'antd';
import ConfigureIcon from 'assets/AlertHistory/ConfigureIcon';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import ROUTES from 'constants/routes';
import AllAlertRules from 'container/ListAlertRules';
import { PlannedDowntime } from 'container/PlannedDowntime/PlannedDowntime';
import RoutingPolicies from 'container/RoutingPolicies';
import TriggeredAlerts from 'container/TriggeredAlerts';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { CalendarClock, GalleryVerticalEnd, Pyramid } from '@signozhq/icons';
import AlertDetails from 'pages/AlertDetails';

import {
	AlertListTabs,
	LEGACY_CONFIGURATION_TAB,
	LEGACY_SUB_TABS,
} from './types';

import './AlertList.styles.scss';

function AllAlertList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	const tab = urlQuery.get('tab');
	const subTab = urlQuery.get('subTab');
	const isAlertHistory = location.pathname === ROUTES.ALERT_HISTORY;
	const isAlertOverview = location.pathname === ROUTES.ALERT_OVERVIEW;

	// Redirect legacy ?tab=Configuration&subTab=... URLs to the flat top-level
	// tab so existing bookmarks and docs continue to work.
	useEffect(() => {
		if (tab !== LEGACY_CONFIGURATION_TAB) {
			return;
		}
		const nextTab =
			subTab === LEGACY_SUB_TABS.ROUTING_POLICIES
				? AlertListTabs.ROUTING_POLICIES
				: AlertListTabs.PLANNED_DOWNTIME;
		const queryParams = new URLSearchParams();
		queryParams.set('tab', nextTab);
		safeNavigate(`/alerts?${queryParams.toString()}`);
	}, [tab, subTab, safeNavigate]);

	const activeKey = useMemo(() => {
		if (tab === LEGACY_CONFIGURATION_TAB) {
			return subTab === LEGACY_SUB_TABS.ROUTING_POLICIES
				? AlertListTabs.ROUTING_POLICIES
				: AlertListTabs.PLANNED_DOWNTIME;
		}
		return tab || AlertListTabs.ALERT_RULES;
	}, [tab, subTab]);

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
					<CalendarClock size={14} />
					Planned Downtime
				</div>
			),
			key: AlertListTabs.PLANNED_DOWNTIME,
			children: <PlannedDowntime />,
		},
		{
			label: (
				<div className="periscope-tab top-level-tab">
					<ConfigureIcon width={14} height={14} />
					Routing Policies
				</div>
			),
			key: AlertListTabs.ROUTING_POLICIES,
			children: <RoutingPolicies />,
		},
	];

	return (
		<Tabs
			destroyInactiveTabPane
			items={items}
			activeKey={activeKey}
			onChange={(tab): void => {
				const queryParams = new URLSearchParams();
				queryParams.set('tab', tab);
				safeNavigate(`/alerts?${queryParams.toString()}`);
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
