/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './SideNav.styles.scss';

import { Button } from 'antd';
import cx from 'classnames';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { GlobalShortcuts } from 'constants/shortcuts/globalShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import useComponentPermission from 'hooks/useComponentPermission';
import { LICENSE_PLAN_KEY, LICENSE_PLAN_STATUS } from 'hooks/useLicense';
import history from 'lib/history';
import {
	AlertTriangle,
	CheckSquare,
	ChevronLeftCircle,
	ChevronRightCircle,
	RocketIcon,
	UserCircle,
} from 'lucide-react';
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { License } from 'types/api/licenses/def';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';
import { checkVersionState, isCloudUser, isEECloudUser } from 'utils/app';

import { routeConfig } from './config';
import { getQueryString } from './helper';
import defaultMenuItems, {
	helpSupportMenuItem,
	inviteMemberMenuItem,
	manageLicenseMenuItem,
	shortcutMenuItem,
	slackSupportMenuItem,
	trySignozCloudMenuItem,
} from './menuItems';
import NavItem from './NavItem/NavItem';
import { SecondaryMenuItemKey, SidebarItem } from './sideNav.types';
import { getActiveMenuKeyFromPath } from './sideNav.utils';

interface UserManagementMenuItems {
	key: string;
	label: string;
	icon: JSX.Element;
}

function SideNav({
	licenseData,
	isFetching,
	onCollapse,
	collapsed,
}: {
	licenseData: any;
	isFetching: boolean;
	onCollapse: () => void;
	collapsed: boolean;
}): JSX.Element {
	const [menuItems, setMenuItems] = useState(defaultMenuItems);

	const { pathname, search } = useLocation();
	const {
		user,
		role,
		featureResponse,
		currentVersion,
		latestVersion,
		isCurrentVersionError,
	} = useSelector<AppState, AppReducer>((state) => state.app);

	const [licenseTag, setLicenseTag] = useState('');

	const userSettingsMenuItem = {
		key: ROUTES.MY_SETTINGS,
		label: user?.name || 'User',
		icon: <UserCircle size={16} />,
	};

	const [userManagementMenuItems, setUserManagementMenuItems] = useState<
		UserManagementMenuItems[]
	>([manageLicenseMenuItem]);

	const onClickSlackHandler = (): void => {
		window.open('https://signoz.io/slack', '_blank');
	};

	const isLatestVersion = checkVersionState(currentVersion, latestVersion);

	const [inviteMembers] = useComponentPermission(['invite_members'], role);

	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	useEffect(() => {
		if (inviteMembers) {
			const updatedUserManagementMenuItems = [
				inviteMemberMenuItem,
				manageLicenseMenuItem,
			];

			setUserManagementMenuItems(updatedUserManagementMenuItems);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [inviteMembers]);

	useEffect((): void => {
		const isOnboardingEnabled =
			featureResponse.data?.find(
				(feature) => feature.name === FeatureKeys.ONBOARDING,
			)?.active || false;

		if (!isOnboardingEnabled || !isCloudUser()) {
			let items = [...menuItems];

			items = items.filter((item) => item.key !== ROUTES.GET_STARTED);

			setMenuItems(items);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [featureResponse.data]);

	// using a separate useEffect as the license fetching call takes few milliseconds
	useEffect(() => {
		if (!isFetching) {
			let items = [...menuItems];

			const isOnBasicPlan =
				licenseData?.payload?.licenses?.some(
					(license: License) =>
						license.isCurrent && license.planKey === LICENSE_PLAN_KEY.BASIC_PLAN,
				) || licenseData?.payload?.licenses === null;

			if (role !== USER_ROLES.ADMIN || isOnBasicPlan) {
				items = items.filter((item) => item.key !== ROUTES.BILLING);
			}

			setMenuItems(items);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [licenseData?.payload?.licenses, isFetching, role]);

	const { t } = useTranslation('');

	const isLicenseActive =
		licenseData?.payload?.licenses?.find((e: License) => e.isCurrent)?.status ===
		LICENSE_PLAN_STATUS.VALID;

	const isEnterprise = licenseData?.payload?.licenses?.some(
		(license: License) =>
			license.isCurrent && license.planKey === LICENSE_PLAN_KEY.ENTERPRISE_PLAN,
	);

	const onClickSignozCloud = (): void => {
		window.open(
			'https://signoz.io/oss-to-cloud/?utm_source=product_navbar&utm_medium=frontend&utm_campaign=oss_users',
			'_blank',
		);
	};

	const isCtrlMetaKey = (e: MouseEvent): boolean => e.ctrlKey || e.metaKey;

	const openInNewTab = (path: string): void => {
		window.open(path, '_blank');
	};

	const onClickShortcuts = (e: MouseEvent): void => {
		if (isCtrlMetaKey(e)) {
			openInNewTab('/shortcuts');
		} else {
			history.push(`/shortcuts`);
		}
	};

	const onClickGetStarted = (event: MouseEvent): void => {
		if (isCtrlMetaKey(event)) {
			openInNewTab('/get-started');
		} else {
			history.push(`/get-started`);
		}
	};

	const onClickVersionHandler = (event: MouseEvent): void => {
		if (isCtrlMetaKey(event)) {
			openInNewTab(ROUTES.VERSION);
		} else {
			history.push(ROUTES.VERSION);
		}
	};

	const onClickHandler = useCallback(
		(key: string, event: MouseEvent | null) => {
			const params = new URLSearchParams(search);
			const availableParams = routeConfig[key];

			const queryString = getQueryString(availableParams || [], params);

			if (pathname !== key) {
				if (event && isCtrlMetaKey(event)) {
					openInNewTab(`${key}?${queryString.join('&')}`);
				} else {
					history.push(`${key}?${queryString.join('&')}`);
				}
			}
		},
		[pathname, search],
	);

	const activeMenuKey = useMemo(() => getActiveMenuKeyFromPath(pathname), [
		pathname,
	]);

	const isCloudUserVal = isCloudUser();

	useEffect(() => {
		if (isCloudUser() || isEECloudUser()) {
			const updatedUserManagementMenuItems = [helpSupportMenuItem];

			setUserManagementMenuItems(updatedUserManagementMenuItems);
		} else if (currentVersion && latestVersion) {
			const versionMenuItem = {
				key: SecondaryMenuItemKey.Version,
				label: !isCurrentVersionError ? currentVersion : t('n_a'),
				icon: !isLatestVersion ? (
					<AlertTriangle color="#E87040" size={16} />
				) : (
					<CheckSquare color="#D5F2BB" size={16} />
				),
				onClick: onClickVersionHandler,
			};

			const updatedUserManagementMenuItems = [
				versionMenuItem,
				slackSupportMenuItem,
				manageLicenseMenuItem,
			];

			setUserManagementMenuItems(updatedUserManagementMenuItems);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentVersion, latestVersion]);

	const handleUserManagentMenuItemClick = (
		key: string,
		event: MouseEvent,
	): void => {
		switch (key) {
			case SecondaryMenuItemKey.Slack:
				onClickSlackHandler();
				break;
			case SecondaryMenuItemKey.Version:
				onClickVersionHandler(event);
				break;
			default:
				onClickHandler(key, event);
				break;
		}
	};

	useEffect(() => {
		if (!isFetching) {
			if (isCloudUserVal) {
				setLicenseTag('Cloud');
			} else if (isEnterprise) {
				setLicenseTag('Enterprise');
			} else {
				setLicenseTag('Free');
			}
		}
	}, [isCloudUserVal, isEnterprise, isFetching]);

	const [isCurrentOrgSettings] = useComponentPermission(
		['current_org_settings'],
		role,
	);

	const settingsRoute = isCurrentOrgSettings
		? ROUTES.ORG_SETTINGS
		: ROUTES.SETTINGS;

	const handleMenuItemClick = (event: MouseEvent, item: SidebarItem): void => {
		if (item.key === ROUTES.SETTINGS) {
			if (isCtrlMetaKey(event)) {
				openInNewTab(settingsRoute);
			} else {
				history.push(settingsRoute);
			}
		} else if (item) {
			onClickHandler(item?.key as string, event);
		}
	};

	useEffect(() => {
		registerShortcut(GlobalShortcuts.SidebarCollapse, onCollapse);

		registerShortcut(GlobalShortcuts.NavigateToServices, () =>
			onClickHandler(ROUTES.APPLICATION, null),
		);
		registerShortcut(GlobalShortcuts.NavigateToTraces, () =>
			onClickHandler(ROUTES.TRACE, null),
		);

		registerShortcut(GlobalShortcuts.NavigateToLogs, () =>
			onClickHandler(ROUTES.LOGS, null),
		);

		registerShortcut(GlobalShortcuts.NavigateToDashboards, () =>
			onClickHandler(ROUTES.ALL_DASHBOARD, null),
		);

		registerShortcut(GlobalShortcuts.NavigateToAlerts, () =>
			onClickHandler(ROUTES.LIST_ALL_ALERT, null),
		);
		registerShortcut(GlobalShortcuts.NavigateToExceptions, () =>
			onClickHandler(ROUTES.ALL_ERROR, null),
		);

		return (): void => {
			deregisterShortcut(GlobalShortcuts.SidebarCollapse);
			deregisterShortcut(GlobalShortcuts.NavigateToServices);
			deregisterShortcut(GlobalShortcuts.NavigateToTraces);
			deregisterShortcut(GlobalShortcuts.NavigateToLogs);
			deregisterShortcut(GlobalShortcuts.NavigateToDashboards);
			deregisterShortcut(GlobalShortcuts.NavigateToAlerts);
			deregisterShortcut(GlobalShortcuts.NavigateToExceptions);
		};
	}, [deregisterShortcut, onClickHandler, onCollapse, registerShortcut]);

	return (
		<div className={cx('sideNav', collapsed ? 'collapsed' : '')}>
			<div className="brand">
				<div
					className="brand-logo"
					// eslint-disable-next-line react/no-unknown-property
					onClick={(event: MouseEvent): void => {
						// Current home page
						onClickHandler(ROUTES.APPLICATION, event);
					}}
				>
					<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />

					{!collapsed && <span className="brand-logo-name"> Weee Raptor </span>}
				</div>

				{/* {!collapsed && licenseTag && (
					<div className="license tag">{licenseTag}</div>
				)} */}
			</div>

			{isCloudUserVal && (
				<div className="get-started-nav-items">
					<Button
						className="get-started-btn"
						onClick={(event: MouseEvent): void => {
							onClickGetStarted(event);
						}}
					>
						<RocketIcon size={16} />

						{!collapsed && <> Get Started </>}
					</Button>
				</div>
			)}

			<div className="primary-nav-items">
				{menuItems.map((item, index) => (
					<NavItem
						isCollapsed={collapsed}
						key={item.key || index}
						item={item}
						isActive={activeMenuKey === item.key}
						onClick={(event): void => {
							handleMenuItemClick(event, item);
						}}
					/>
				))}
			</div>

			<div className="secondary-nav-items">
				{/* <NavItem
					isCollapsed={collapsed}
					key="keyboardShortcuts"
					item={shortcutMenuItem}
					isActive={false}
					onClick={onClickShortcuts}
				/> */}

				{/* {licenseData && !isLicenseActive && (
					<NavItem
						isCollapsed={collapsed}
						key="trySignozCloud"
						item={trySignozCloudMenuItem}
						isActive={false}
						onClick={onClickSignozCloud}
					/>
				)} */}

				{/* {userManagementMenuItems.map(
					(item, index): JSX.Element => (
						<NavItem
							isCollapsed={collapsed}
							key={item?.key || index}
							item={item}
							isActive={activeMenuKey === item?.key}
							onClick={(event: MouseEvent): void => {
								handleUserManagentMenuItemClick(item?.key as string, event);
							}}
						/>
					),
				)} */}

				{inviteMembers && (
					<NavItem
						isCollapsed={collapsed}
						key={inviteMemberMenuItem.key}
						item={inviteMemberMenuItem}
						isActive={activeMenuKey === inviteMemberMenuItem?.key}
						onClick={(event: React.MouseEvent): void => {
							if (isCtrlMetaKey(event)) {
								openInNewTab(`${inviteMemberMenuItem.key}`);
							} else {
								history.push(`${inviteMemberMenuItem.key}`);
							}
						}}
					/>
				)}

				{user && (
					<NavItem
						isCollapsed={collapsed}
						key={ROUTES.MY_SETTINGS}
						item={userSettingsMenuItem}
						isActive={activeMenuKey === userSettingsMenuItem?.key}
						onClick={(event: MouseEvent): void => {
							handleUserManagentMenuItemClick(
								userSettingsMenuItem?.key as string,
								event,
							);
						}}
					/>
				)}

				<div className="collapse-expand-handlers" onClick={onCollapse}>
					{collapsed ? (
						<ChevronRightCircle size={18} />
					) : (
						<ChevronLeftCircle size={18} />
					)}
				</div>
			</div>
		</div>
	);
}

export default SideNav;
