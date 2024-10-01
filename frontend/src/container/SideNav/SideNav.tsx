/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './SideNav.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import logEvent from 'api/common/logEvent';
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
}: {
	licenseData: any;
	isFetching: boolean;
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

	const isCloudUserVal = isCloudUser();

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

			if (
				role !== USER_ROLES.ADMIN ||
				isOnBasicPlan ||
				!(isCloudUserVal || isEECloudUser())
			) {
				items = items.filter((item) => item.key !== ROUTES.BILLING);
			}

			setMenuItems(items);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [licenseData?.payload?.licenses, isFetching, role]);

	const { t } = useTranslation('');

	const licenseStatus: string =
		licenseData?.payload?.licenses?.find((e: License) => e.isCurrent)?.status ||
		'';

	const isLicenseActive =
		licenseStatus?.toLocaleLowerCase() ===
		LICENSE_PLAN_STATUS.VALID.toLocaleLowerCase();

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
		// eslint-disable-next-line sonarjs/no-duplicate-string
		logEvent('Sidebar: Menu clicked', {
			menuRoute: '/shortcuts',
			menuLabel: 'Keyboard Shortcuts',
		});
		if (isCtrlMetaKey(e)) {
			openInNewTab('/shortcuts');
		} else {
			history.push(`/shortcuts`);
		}
	};

	const onClickGetStarted = (event: MouseEvent): void => {
		logEvent('Sidebar: Menu clicked', {
			menuRoute: '/get-started',
			menuLabel: 'Get Started',
		});
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
					history.push(`${key}?${queryString.join('&')}`, {
						from: pathname,
					});
				}
			}
		},
		[pathname, search],
	);

	const activeMenuKey = useMemo(() => getActiveMenuKeyFromPath(pathname), [
		pathname,
	]);

	useEffect(() => {
		if (isCloudUser() || isEECloudUser()) {
			const updatedUserManagementMenuItems = [helpSupportMenuItem];

			setUserManagementMenuItems(updatedUserManagementMenuItems);
		} else if (currentVersion && latestVersion) {
			const versionMenuItem = {
				key: SecondaryMenuItemKey.Version,
				label: !isCurrentVersionError ? currentVersion : t('n_a'),
				icon: !isLatestVersion ? (
					<AlertTriangle color={Color.BG_CHERRY_600} size={16} />
				) : (
					<CheckSquare color={Color.BG_FOREST_500} size={16} />
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

	useEffect(() => {
		if (!(isCloudUserVal || isEECloudUser())) {
			let updatedMenuItems = [...menuItems];
			updatedMenuItems = updatedMenuItems.filter(
				(item) => item.key !== ROUTES.INTEGRATIONS,
			);
			setMenuItems(updatedMenuItems);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
		logEvent('Sidebar: Menu clicked', {
			menuRoute: item?.key,
			menuLabel: item?.label,
		});
	};

	useEffect(() => {
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

		registerShortcut(GlobalShortcuts.NavigateToMessagingQueues, () =>
			onClickHandler(ROUTES.MESSAGING_QUEUES, null),
		);

		registerShortcut(GlobalShortcuts.NavigateToAlerts, () =>
			onClickHandler(ROUTES.LIST_ALL_ALERT, null),
		);
		registerShortcut(GlobalShortcuts.NavigateToExceptions, () =>
			onClickHandler(ROUTES.ALL_ERROR, null),
		);

		return (): void => {
			deregisterShortcut(GlobalShortcuts.NavigateToServices);
			deregisterShortcut(GlobalShortcuts.NavigateToTraces);
			deregisterShortcut(GlobalShortcuts.NavigateToLogs);
			deregisterShortcut(GlobalShortcuts.NavigateToDashboards);
			deregisterShortcut(GlobalShortcuts.NavigateToAlerts);
			deregisterShortcut(GlobalShortcuts.NavigateToExceptions);
			deregisterShortcut(GlobalShortcuts.NavigateToMessagingQueues);
		};
	}, [deregisterShortcut, onClickHandler, registerShortcut]);

	return (
		<div className={cx('sidenav-container')}>
			<div className={cx('sideNav')}>
				<div className="brand">
					<div className="brand-company-meta">
						<div
							className="brand-logo"
							// eslint-disable-next-line react/no-unknown-property
							onClick={(event: MouseEvent): void => {
								// Current home page
								onClickHandler(ROUTES.APPLICATION, event);
							}}
						>
							<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />

							<span className="brand-logo-name nav-item-label"> SigNoz </span>
						</div>

						{licenseTag && (
							<div className="license tag nav-item-label">{licenseTag}</div>
						)}
					</div>
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

							<div className="license tag nav-item-label"> Get Started </div>
						</Button>
					</div>
				)}

				<div className={cx(`nav-wrapper`, isCloudUserVal && 'nav-wrapper-cloud')}>
					<div className="primary-nav-items">
						{menuItems.map((item, index) => (
							<NavItem
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
						<NavItem
							key="keyboardShortcuts"
							item={shortcutMenuItem}
							isActive={false}
							onClick={onClickShortcuts}
						/>

						{licenseData && !isLicenseActive && (
							<NavItem
								key="trySignozCloud"
								item={trySignozCloudMenuItem}
								isActive={false}
								onClick={onClickSignozCloud}
							/>
						)}

						{userManagementMenuItems.map(
							(item, index): JSX.Element => (
								<NavItem
									key={item?.key || index}
									item={item}
									isActive={activeMenuKey === item?.key}
									onClick={(event: MouseEvent): void => {
										handleUserManagentMenuItemClick(item?.key as string, event);
										logEvent('Sidebar: Menu clicked', {
											menuRoute: item?.key,
											menuLabel: item?.label,
										});
									}}
								/>
							),
						)}

						{inviteMembers && (
							<NavItem
								key={inviteMemberMenuItem.key}
								item={inviteMemberMenuItem}
								isActive={activeMenuKey === inviteMemberMenuItem?.key}
								onClick={(event: React.MouseEvent): void => {
									if (isCtrlMetaKey(event)) {
										openInNewTab(`${inviteMemberMenuItem.key}`);
									} else {
										history.push(`${inviteMemberMenuItem.key}`);
									}
									logEvent('Sidebar: Menu clicked', {
										menuRoute: inviteMemberMenuItem?.key,
										menuLabel: inviteMemberMenuItem?.label,
									});
								}}
							/>
						)}

						{user && (
							<NavItem
								key={ROUTES.MY_SETTINGS}
								item={userSettingsMenuItem}
								isActive={activeMenuKey === userSettingsMenuItem?.key}
								onClick={(event: MouseEvent): void => {
									handleUserManagentMenuItemClick(
										userSettingsMenuItem?.key as string,
										event,
									);
									logEvent('Sidebar: Menu clicked', {
										menuRoute: userSettingsMenuItem?.key,
										menuLabel: 'User',
									});
								}}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default SideNav;
