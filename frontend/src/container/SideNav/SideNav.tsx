import './SideNav.styles.scss';

import { CheckCircleTwoTone, WarningOutlined } from '@ant-design/icons';
import { MenuProps } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import useLicense, { LICENSE_PLAN_KEY } from 'hooks/useLicense';
import history from 'lib/history';
import { LifeBuoy, MessageSquare, UserCircle, UserPlus } from 'lucide-react';
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
import { sideBarCollapse } from 'store/actions/app';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';
import { checkVersionState, isCloudUser, isEECloudUser } from 'utils/app';

import { routeConfig } from './config';
import { getQueryString } from './helper';
import defaultMenuItems from './menuItems';
import NavItem from './NavItem/NavItem';
import { MenuItem, SecondaryMenuItemKey } from './sideNav.types';
import { getActiveMenuKeyFromPath } from './sideNav.utils';
import Slack from './Slack';
import { MenuLabelContainer, RedDot, StyledText } from './styles';

function SideNav(): JSX.Element {
	const dispatch = useDispatch();
	const [menuItems, setMenuItems] = useState(defaultMenuItems);
	const [collapsed, setCollapsed] = useState<boolean>(
		getLocalStorageKey(IS_SIDEBAR_COLLAPSED) === 'true',
	);

	const { user, role, featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const { data, isFetching } = useLicense();

	const { name, email } = user;

	let secondaryMenuItems: MenuItem[] = [];

	let userManagementMenuItems: MenuItem[] = [
		{
			key: ROUTES.ORG_SETTINGS,
			label: 'Invite Team Member',
			icon: <UserPlus size={16} />,
		},
		{
			key: ROUTES.SUPPORT,
			label: 'Help & Support',
			icon: <MessageSquare size={16} />,
		},
		{
			key: ROUTES.MY_SETTINGS,
			label: name || 'User',
			icon: <UserCircle size={16} />,
		},
	];

	// const menu: MenuProps = useMemo(
	// 	() => ({
	// 		items: [
	// 			{
	// 				key: 'main-menu',
	// 				label: (
	// 					<div>
	// 						<SignedIn onToggle={onToggleHandler(setIsUserDropDownOpen)} />
	// 						<Divider />
	// 						<CurrentOrganization onToggle={onToggleHandler(setIsUserDropDownOpen)} />
	// 						<Divider />
	// 						<ManageLicense onToggle={onToggleHandler(setIsUserDropDownOpen)} />
	// 						<Divider />
	// 						<LogoutContainer>
	// 							<LogoutOutlined />
	// 							<div
	// 								tabIndex={0}
	// 								onKeyDown={onLogoutKeyDown}
	// 								role="button"
	// 								onClick={Logout}
	// 							>
	// 								<Typography.Link>Logout</Typography.Link>
	// 							</div>
	// 						</LogoutContainer>
	// 					</div>
	// 				),
	// 			},
	// 		],
	// 	}),
	// 	[onToggleHandler, onLogoutKeyDown],
	// );

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
				data?.payload?.licenses?.some(
					(license) =>
						license.isCurrent && license.planKey === LICENSE_PLAN_KEY.BASIC_PLAN,
				) || data?.payload?.licenses === null;

			if (role !== USER_ROLES.ADMIN || isOnBasicPlan) {
				items = items.filter((item) => item.key !== ROUTES.BILLING);
			}

			setMenuItems(items);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data?.payload?.licenses, isFetching, role]);

	const { pathname, search } = useLocation();

	const { t } = useTranslation('');

	const onCollapse = useCallback(() => {
		setCollapsed((collapsed) => !collapsed);
	}, []);

	useLayoutEffect(() => {
		dispatch(sideBarCollapse(collapsed));
	}, [collapsed, dispatch]);

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

	const onClickMenuHandler: MenuProps['onClick'] = (e) => {
		onClickHandler(e.key);
	};

	const onClickSlackHandler = (): void => {
		window.open('https://signoz.io/slack', '_blank');
	};

	const onClickVersionHandler = (): void => {
		history.push(ROUTES.VERSION);
	};

	// const isLatestVersion = checkVersionState(currentVersion, latestVersion);

	// if (isCloudUser() || isEECloudUser()) {
	// 	secondaryMenuItems = [
	// 		{
	// 			key: SecondaryMenuItemKey.Support,
	// 			label: 'Support',
	// 			icon: <LifeBuoy />,
	// 			onClick: onClickMenuHandler,
	// 		},
	// 	];
	// } else {
	// 	secondaryMenuItems = [
	// 		{
	// 			key: SecondaryMenuItemKey.Version,
	// 			icon: !isLatestVersion ? (
	// 				<WarningOutlined style={{ color: '#E87040' }} />
	// 			) : (
	// 				<CheckCircleTwoTone twoToneColor={['#D5F2BB', '#1f1f1f']} />
	// 			),
	// 			label: (
	// 				<MenuLabelContainer>
	// 					<StyledText ellipsis>
	// 						{!isCurrentVersionError ? currentVersion : t('n_a')}
	// 					</StyledText>
	// 					{!isLatestVersion && <RedDot />}
	// 				</MenuLabelContainer>
	// 			),
	// 			onClick: onClickVersionHandler,
	// 		},
	// 		{
	// 			key: SecondaryMenuItemKey.Slack,
	// 			icon: <Slack />,
	// 			label: <StyledText>Support</StyledText>,
	// 			onClick: onClickSlackHandler,
	// 		},
	// 	];
	// }

	const activeMenuKey = useMemo(() => getActiveMenuKeyFromPath(pathname), [
		pathname,
	]);

	console.log('activeMenu', menuItems);

	return (
		// <Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={200}>
		<div className="sideNav">
			<div className="brand">
				<div className="brand-logo">
					<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />
				</div>

				<div className="license tag">Enterprise</div>
			</div>

			<div className="primary-nav-items">
				{menuItems.map((item, index) => (
					<NavItem
						key={item.key || index}
						item={item}
						isActive={activeMenuKey === item.key}
						onClickHandler={(): void => {
							console.log('item', item);
							onClickHandler(item.key);
						}}
					/>
				))}
			</div>

			<div className="secondary-nav-items">
				{userManagementMenuItems.map(
					(item, index): JSX.Element => (
						<NavItem
							key={item.key || index}
							item={item}
							isActive={activeMenuKey === item.key}
							onClickHandler={(): void => {
								console.log('item', item);
								onClickHandler(item.key);
							}}
						/>
					),
				)}
			</div>

			{/* <StyledPrimaryMenu
				// theme="dark"
				defaultSelectedKeys={[ROUTES.APPLICATION]}
				selectedKeys={activeMenuKey ? [activeMenuKey] : []}
				mode="vertical"
				style={styles}
				items={menuItems}
				onClick={onClickMenuHandler}
			/>
			<StyledSecondaryMenu
				theme="dark"
				selectedKeys={activeMenuKey ? [activeMenuKey] : []}
				mode="vertical"
				style={styles}
				items={secondaryMenuItems}
			/> */}

			{/* <br />
			<ToggleButton
				checked={isDarkMode}
				onChange={toggleTheme}
				defaultChecked={isDarkMode}
				checkedChildren="🌜"
				unCheckedChildren="🌞"
			/> */}
		</div>

		// </Sider>
	);
}

export default SideNav;
