/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './SideNav.styles.scss';

import { Button } from 'antd';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { ToggleButton } from 'container/Header/styles';
import useComponentPermission from 'hooks/useComponentPermission';
import useThemeMode, { useIsDarkMode } from 'hooks/useDarkMode';
import { LICENSE_PLAN_KEY, LICENSE_PLAN_STATUS } from 'hooks/useLicense';
import history from 'lib/history';
import { RocketIcon, UserCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { License } from 'types/api/licenses/def';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';
import { isCloudUser } from 'utils/app';

import { routeConfig } from './config';
import { getQueryString } from './helper';
import defaultMenuItems, {
	// getStartedMenuItem,
	inviteMemberMenuItem,
	manageLicenseMenuItem,
	trySignozCloudMenuItem,
} from './menuItems';
import NavItem from './NavItem/NavItem';
import { SidebarItem } from './sideNav.types';
import { getActiveMenuKeyFromPath } from './sideNav.utils';

function SideNav({
	licenseData,
	isFetching,
}: {
	licenseData: any;
	isFetching: boolean;
}): JSX.Element {
	// const dispatch = useDispatch();
	const [menuItems, setMenuItems] = useState(defaultMenuItems);

	const { pathname, search } = useLocation();
	const { user, role, featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const defaultUserManagementMenuItems: SidebarItem[] = useMemo(
		() => [
			manageLicenseMenuItem,
			{
				key: ROUTES.MY_SETTINGS,
				label: user?.name || 'User',
				icon: <UserCircle size={16} />,
			},
		],
		[user],
	);

	const [userManagementMenuItems, setUserManagementMenuItems] = useState(
		defaultUserManagementMenuItems,
	);

	const [inviteMembers] = useComponentPermission(['invite_members'], role);

	// const secondaryMenuItems: MenuItem[] = [];

	useEffect(() => {
		if (inviteMembers) {
			const updatedUserManagementMenuItems = [
				inviteMemberMenuItem,
				...defaultUserManagementMenuItems,
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

	// const { t } = useTranslation('');

	// const onCollapse = useCallback(() => {
	// 	setCollapsed((collapsed) => !collapsed);
	// }, []);

	// useLayoutEffect(() => {
	// 	dispatch(sideBarCollapse(collapsed));
	// }, [collapsed, dispatch]);

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

	return (
		<div className="sideNav">
			<div className="brand">
				<div
					className="brand-logo"
					// eslint-disable-next-line react/no-unknown-property
					onClick={(): void => {
						onClickHandler('/');
					}}
				>
					<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />

					<span className="brand-logo-name"> SigNoz </span>
				</div>

				<div className="license tag">{!isEnterprise ? 'Free' : 'Enterprise'}</div>

				<ToggleButton
					checked={isDarkMode}
					onChange={toggleTheme}
					defaultChecked={isDarkMode}
					checkedChildren="🌜"
					unCheckedChildren="🌞"
				/>
			</div>

			{isCloudUserVal && (
				<div className="get-started-nav-items">
					<Button className="get-started-btn" onClick={onClickGetStarted}>
						<RocketIcon size={16} /> Get Started
					</Button>
				</div>
			)}

			<div className="primary-nav-items">
				{menuItems.map((item, index) => (
					<NavItem
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
				{!isLicenseActive && (
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
							onClick={(): void => {
								onClickHandler(item?.key as string);
							}}
						/>
					),
				)}
			</div>
		</div>
	);
}

export default SideNav;
