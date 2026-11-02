import { useCallback, useMemo } from 'react';
import { Tabs, TabsProps } from 'antd';
import { useAppLocation } from 'lib/router/useAppLocation';
import ConfigureIcon from 'assets/AlertHistory/ConfigureIcon';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import ROUTES from 'constants/routes';
import AllAlertRules from 'container/ListAlertRules';
import { PlannedDowntime } from 'container/PlannedDowntime/PlannedDowntime';
import RoutingPolicies from 'container/RoutingPolicies';
import TriggeredAlerts from 'container/TriggeredAlerts';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { GalleryVerticalEnd, Pyramid } from '@signozhq/icons';
import cx from 'classnames';
import AlertDetails from 'pages/AlertDetails';
import ChannelsEdit from 'pages/ChannelsEdit';
import ChannelsNew from 'pages/ChannelsNew';

import NotificationChannels from './NotificationChannels/NotificationChannels';

import { AlertListSubTabs, AlertListTabs } from './types';

import './AlertList.styles.scss';

interface ConfigurationSidebarItem {
	key: AlertListSubTabs;
	label: string;
	itemKey: string;
}

const CONFIGURATION_SIDEBAR_ITEMS: ConfigurationSidebarItem[] = [
	{
		key: AlertListSubTabs.CHANNELS,
		label: 'Notification Channels',
		itemKey: 'configuration-sidebar-channels',
	},
	{
		key: AlertListSubTabs.ROUTING_POLICIES,
		label: 'Routing Policies',
		itemKey: 'configuration-sidebar-routing-policies',
	},
	{
		key: AlertListSubTabs.PLANNED_DOWNTIME,
		label: 'Planned Downtime',
		itemKey: 'configuration-sidebar-planned-downtime',
	},
];

function AllAlertList(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useAppLocation();
	const { safeNavigate } = useSafeNavigate();

	const tab = urlQuery.get('tab');
	const subTab = urlQuery.get('subTab');
	const isAlertHistory = location.pathname === ROUTES.ALERT_HISTORY;
	const isAlertOverview = location.pathname === ROUTES.ALERT_OVERVIEW;
	const isChannelsNew = location.pathname === ROUTES.CHANNELS_NEW;
	const isChannelsEdit = location.pathname.startsWith('/alerts/channels/edit/');
	const isChannelDetails = isChannelsNew || isChannelsEdit;

	const getActiveTab = useCallback((): string => {
		if (isAlertHistory || isAlertOverview) {
			return AlertListTabs.ALERT_RULES;
		}
		if (isChannelDetails) {
			return AlertListTabs.CONFIGURATION;
		}
		if (
			tab === AlertListTabs.CHANNELS ||
			tab === AlertListTabs.ROUTING_POLICIES ||
			tab === AlertListTabs.PLANNED_DOWNTIME
		) {
			return AlertListTabs.CONFIGURATION;
		}
		return tab || AlertListTabs.ALERT_RULES;
	}, [isAlertHistory, isAlertOverview, isChannelDetails, tab]);

	const getActiveSubTab = useCallback((): AlertListSubTabs => {
		if (isChannelDetails) {
			return AlertListSubTabs.CHANNELS;
		}
		if (tab === AlertListTabs.CHANNELS) {
			return AlertListSubTabs.CHANNELS;
		}
		if (tab === AlertListTabs.ROUTING_POLICIES) {
			return AlertListSubTabs.ROUTING_POLICIES;
		}
		if (tab === AlertListTabs.PLANNED_DOWNTIME) {
			return AlertListSubTabs.PLANNED_DOWNTIME;
		}
		if (
			subTab === AlertListSubTabs.CHANNELS ||
			subTab === AlertListSubTabs.ROUTING_POLICIES ||
			subTab === AlertListSubTabs.PLANNED_DOWNTIME
		) {
			return subTab;
		}
		return AlertListSubTabs.CHANNELS;
	}, [isChannelDetails, tab, subTab]);

	const handleTopTabChange = useCallback(
		(newTab: string): void => {
			const queryParams = new URLSearchParams();
			queryParams.set('tab', newTab);

			if (newTab === AlertListTabs.CONFIGURATION) {
				const currentSubTab = getActiveSubTab();
				queryParams.set('subTab', currentSubTab);
			}

			safeNavigate(`/alerts?${queryParams.toString()}`);
		},
		[getActiveSubTab, safeNavigate],
	);

	const handleSubTabChange = useCallback(
		(newSubTab: AlertListSubTabs): void => {
			const queryParams = new URLSearchParams();
			queryParams.set('tab', AlertListTabs.CONFIGURATION);
			queryParams.set('subTab', newSubTab);
			safeNavigate(`/alerts?${queryParams.toString()}`);
		},
		[safeNavigate],
	);

	const activeSubTab = getActiveSubTab();

	const configurationTab = useMemo(
		() => (
			<div className="alert-configuration-container">
				<div
					className="alert-configuration-sidebar"
					data-testid="alert-configuration-sidebar"
				>
					{CONFIGURATION_SIDEBAR_ITEMS.map((item) => (
						<button
							key={item.key}
							type="button"
							className={cx('sidebar-nav-item', {
								active: activeSubTab === item.key,
							})}
							onClick={(): void => handleSubTabChange(item.key)}
							data-testid={item.itemKey}
						>
							<span className="sidebar-nav-item-label">{item.label}</span>
						</button>
					))}
				</div>
				<div
					className="alert-configuration-content"
					data-testid="alert-configuration-content"
				>
					{activeSubTab === AlertListSubTabs.CHANNELS && (
						<div className="alert-rules-container">
							{isChannelsNew && <ChannelsNew />}
							{isChannelsEdit && <ChannelsEdit />}
							{!isChannelDetails && <NotificationChannels />}
						</div>
					)}
					{activeSubTab === AlertListSubTabs.ROUTING_POLICIES && (
						<div className="alert-rules-container">
							<RoutingPolicies />
						</div>
					)}
					{activeSubTab === AlertListSubTabs.PLANNED_DOWNTIME && (
						<div className="alert-rules-container">
							<PlannedDowntime />
						</div>
					)}
				</div>
			</div>
		),
		[
			activeSubTab,
			handleSubTabChange,
			isChannelsNew,
			isChannelsEdit,
			isChannelDetails,
		],
	);

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
			activeKey={getActiveTab()}
			onChange={handleTopTabChange}
			className={`alerts-container ${
				isAlertHistory || isAlertOverview || isChannelDetails
					? 'alert-details-tabs'
					: ''
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
