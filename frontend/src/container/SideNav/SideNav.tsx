import { CheckCircleTwoTone, WarningOutlined } from '@ant-design/icons';
import { MenuProps } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import getFeaturesFlags from 'api/features/getFeatureFlags';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import history from 'lib/history';
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
	const { currentVersion, latestVersion, isCurrentVersionError } = useSelector<
		AppState,
		AppReducer
	>((state) => state.app);

	const { pathname, search } = useLocation();

	const { t } = useTranslation('');

	const onCollapse = useCallback(() => {
		setCollapsed((collapsed) => !collapsed);
	}, []);

	const isOnboardingEnabled = (featureFlags: any): boolean => {
		for (let index = 0; index < featureFlags.length; index += 1) {
			const featureFlag = featureFlags[index];
			// Temporarily using OSS feature flag, need to switch to ONBOARDING once API changes are available
			if (featureFlag.name === FeatureKeys.ONBOARDING) {
				return featureFlag.active;
			}
		}

		return false;
	};

	const setRoutesBasedOnFF = (featureFlags: any): void => {
		if (!isOnboardingEnabled(featureFlags)) {
			const newRoutes = menuItems.filter(
				(menuItem) => menuItem?.key !== ROUTES.GET_STARTED,
			);

			setMenuItems(newRoutes);
		}
	};

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
		async function fetchFeatureFlags() {
			try {
				const response = await getFeaturesFlags();

				setRoutesBasedOnFF(response.payload);
			} catch (error) {
				console.error('Error fetching data:', error);
			}
		}

		fetchFeatureFlags();
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

	const isNotCurrentVersion = currentVersion !== latestVersion;

	const secondaryMenuItems: MenuItem[] = [
		{
			key: SecondaryMenuItemKey.Version,
			icon: isNotCurrentVersion ? (
				<WarningOutlined style={{ color: '#E87040' }} />
			) : (
				<CheckCircleTwoTone twoToneColor={['#D5F2BB', '#1f1f1f']} />
			),
			label: (
				<MenuLabelContainer>
					<StyledText ellipsis>
						{!isCurrentVersionError ? currentVersion : t('n_a')}
					</StyledText>
					{isNotCurrentVersion && <RedDot />}
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
