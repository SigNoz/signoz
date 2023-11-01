import { CheckCircleTwoTone, WarningOutlined } from '@ant-design/icons';
import { MenuProps } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import useLicense, { LICENSE_PLAN_KEY } from 'hooks/useLicense';
import history from 'lib/history';
import { LifeBuoy } from 'lucide-react';
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

import { routeConfig, styles } from './config';
import { getQueryString } from './helper';
import defaultMenuItems from './menuItems';
import { MenuItem, SecondaryMenuItemKey } from './sideNav.types';
import { getActiveMenuKeyFromPath } from './sideNav.utils';
import Slack from './Slack';
import {
	MenuLabelContainer,
	RedDot,
	Sider,
	StyledPrimaryMenu,
	StyledSecondaryMenu,
	StyledText,
} from './styles';

function SideNav(): JSX.Element {
	const dispatch = useDispatch();
	const [menuItems, setMenuItems] = useState(defaultMenuItems);
	const [collapsed, setCollapsed] = useState<boolean>(
		getLocalStorageKey(IS_SIDEBAR_COLLAPSED) === 'true',
	);
	const {
		role,
		currentVersion,
		latestVersion,
		isCurrentVersionError,
		featureResponse,
	} = useSelector<AppState, AppReducer>((state) => state.app);

	const { data, isFetching } = useLicense();

	let secondaryMenuItems: MenuItem[] = [];

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

	const isLatestVersion = checkVersionState(currentVersion, latestVersion);

	if (isCloudUser() || isEECloudUser()) {
		secondaryMenuItems = [
			{
				key: SecondaryMenuItemKey.Support,
				label: 'Support',
				icon: <LifeBuoy />,
				onClick: onClickMenuHandler,
			},
		];
	} else {
		secondaryMenuItems = [
			{
				key: SecondaryMenuItemKey.Version,
				icon: !isLatestVersion ? (
					<WarningOutlined style={{ color: '#E87040' }} />
				) : (
					<CheckCircleTwoTone twoToneColor={['#D5F2BB', '#1f1f1f']} />
				),
				label: (
					<MenuLabelContainer>
						<StyledText ellipsis>
							{!isCurrentVersionError ? currentVersion : t('n_a')}
						</StyledText>
						{!isLatestVersion && <RedDot />}
					</MenuLabelContainer>
				),
				onClick: onClickVersionHandler,
			},
			{
				key: SecondaryMenuItemKey.Slack,
				icon: <Slack />,
				label: <StyledText>Support</StyledText>,
				onClick: onClickSlackHandler,
			},
		];
	}

	const activeMenuKey = useMemo(() => getActiveMenuKeyFromPath(pathname), [
		pathname,
	]);

	return (
		<Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={200}>
			<StyledPrimaryMenu
				theme="dark"
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
			/>
		</Sider>
	);
}

export default SideNav;
