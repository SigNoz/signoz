/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './SideNav.styles.scss';

import { Button } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import cx from 'classnames';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { ToggleButton } from 'container/Header/styles';
import useComponentPermission from 'hooks/useComponentPermission';
import useThemeMode, { useIsDarkMode } from 'hooks/useDarkMode';
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
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { sideBarCollapse } from 'store/actions';
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
	slackSupportMenuItem,
	trySignozCloudMenuItem,
} from './menuItems';
import NavItem from './NavItem/NavItem';
import { SecondaryMenuItemKey } from './sideNav.types';
import { getActiveMenuKeyFromPath } from './sideNav.utils';

function SideNav({
	licenseData,
	isFetching,
}: {
	licenseData: any;
	isFetching: boolean;
}): JSX.Element {
	const dispatch = useDispatch();
	const [menuItems, setMenuItems] = useState(defaultMenuItems);
	const [collapsed, setCollapsed] = useState<boolean>(
		getLocalStorageKey(IS_SIDEBAR_COLLAPSED) === 'true',
	);

	const { pathname, search } = useLocation();
	const {
		user,
		role,
		featureResponse,
		currentVersion,
		latestVersion,
		isCurrentVersionError,
	} = useSelector<AppState, AppReducer>((state) => state.app);

	const userSettingsMenuItem = {
		key: ROUTES.MY_SETTINGS,
		label: user?.name || 'User',
		icon: <UserCircle size={16} />,
	};

	const [userManagementMenuItems, setUserManagementMenuItems] = useState([
		manageLicenseMenuItem,
	]);

	const onClickSlackHandler = (): void => {
		window.open('https://signoz.io/slack', '_blank');
	};

	const onClickVersionHandler = (): void => {
		history.push(ROUTES.VERSION);
	};

	const isLatestVersion = checkVersionState(currentVersion, latestVersion);

	const [inviteMembers] = useComponentPermission(['invite_members'], role);

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

	const onCollapse = useCallback(() => {
		setCollapsed((collapsed) => !collapsed);
	}, []);

	useLayoutEffect(() => {
		dispatch(sideBarCollapse(collapsed));
	}, [collapsed, dispatch]);

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

	const onClickGetStarted = (): void => {
		history.push(`/get-started`);
	};

	const onClickHandler = useCallback(
		(key: string) => {
			const params = new URLSearchParams(search);
			const availableParams = routeConfig[key];

			const queryString = getQueryString(availableParams || [], params);

			if (pathname !== key) {
				history.push(`${key}?${queryString.join('&')}`);
			}
		},
		[pathname, search],
	);

	const activeMenuKey = useMemo(() => getActiveMenuKeyFromPath(pathname), [
		pathname,
	]);

	const isDarkMode = useIsDarkMode();
	const { toggleTheme } = useThemeMode();

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

	const handleUserManagentMenuItemClick = (key: string): void => {
		switch (key) {
			case SecondaryMenuItemKey.Slack:
				onClickSlackHandler();
				break;
			case SecondaryMenuItemKey.Version:
				onClickVersionHandler();
				break;
			default:
				onClickHandler(key);
				break;
		}
	};

	return (
		<div className={cx('sideNav', collapsed ? 'collapsed' : '')}>
			<div className="brand">
				<div
					className="brand-logo"
					// eslint-disable-next-line react/no-unknown-property
					onClick={(): void => {
						// Current home page
						onClickHandler(ROUTES.APPLICATION);
					}}
				>
					<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />

					{!collapsed && <span className="brand-logo-name"> SigNoz </span>}
				</div>

				{!collapsed && (
					<>
						<div className="license tag">{!isEnterprise ? 'Free' : 'Enterprise'}</div>

						<ToggleButton
							checked={isDarkMode}
							onChange={toggleTheme}
							defaultChecked={isDarkMode}
							checkedChildren="🌜"
							unCheckedChildren="🌞"
						/>
					</>
				)}
			</div>

			{isCloudUserVal && (
				<div className="get-started-nav-items">
					<Button className="get-started-btn" onClick={onClickGetStarted}>
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
						onClick={(): void => {
							if (item) {
								onClickHandler(item?.key as string);
							}
						}}
					/>
				))}
			</div>

			<div className="secondary-nav-items">
				{licenseData && !isLicenseActive && (
					<NavItem
						isCollapsed={collapsed}
						key="trySignozCloud"
						item={trySignozCloudMenuItem}
						isActive={false}
						onClick={onClickSignozCloud}
					/>
				)}

				{userManagementMenuItems.map(
					(item, index): JSX.Element => (
						<NavItem
							isCollapsed={collapsed}
							key={item?.key || index}
							item={item}
							isActive={activeMenuKey === item?.key}
							onClick={(): void => {
								handleUserManagentMenuItemClick(item?.key as string);
							}}
						/>
					),
				)}

				{inviteMembers && (
					<NavItem
						isCollapsed={collapsed}
						key={inviteMemberMenuItem.key}
						item={inviteMemberMenuItem}
						isActive={activeMenuKey === inviteMemberMenuItem?.key}
						onClick={(): void => {
							history.push(`${inviteMemberMenuItem.key}`);
						}}
					/>
				)}

				{user && (
					<NavItem
						isCollapsed={collapsed}
						key={ROUTES.MY_SETTINGS}
						item={userSettingsMenuItem}
						isActive={activeMenuKey === userSettingsMenuItem?.key}
						onClick={(): void => {
							handleUserManagentMenuItemClick(userSettingsMenuItem?.key as string);
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
