import { CheckCircleTwoTone, WarningOutlined } from '@ant-design/icons';
import { Menu, MenuProps } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import {
	ReactNode,
	useCallback,
	useLayoutEffect,
	useMemo,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { SideBarCollapse } from 'store/actions/app';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { routeConfig, styles } from './config';
import { getQueryString } from './helper';
import menus from './menuItems';
import Slack from './Slack';
import {
	RedDot,
	Sider,
	SlackButton,
	SlackMenuItemContainer,
	VersionContainer,
} from './styles';

function SideNav(): JSX.Element {
	const dispatch = useDispatch();
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

	useLayoutEffect(() => {
		dispatch(SideBarCollapse(collapsed));
	}, [collapsed, dispatch]);

	const onClickHandler = useCallback(
		(to: string) => {
			const params = new URLSearchParams(search);
			const availableParams = routeConfig[to];

			const queryString = getQueryString(availableParams || [], params);

			if (pathname !== to) {
				history.push(`${to}?${queryString.join('&')}`);
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

	const sidebar: SidebarItem[] = [
		{
			onClick: onClickSlackHandler,
			icon: <Slack />,
			text: <SlackButton>Support</SlackButton>,
			key: 'slack',
		},
		{
			onClick: onClickVersionHandler,
			key: 'version',
			icon: isNotCurrentVersion ? (
				<WarningOutlined style={{ color: '#E87040' }} />
			) : (
				<CheckCircleTwoTone twoToneColor={['#D5F2BB', '#1f1f1f']} />
			),
			text: (
				<VersionContainer>
					{!isCurrentVersionError ? (
						<SlackButton>{currentVersion}</SlackButton>
					) : (
						<SlackButton>{t('n_a')}</SlackButton>
					)}
					{isNotCurrentVersion && <RedDot />}
				</VersionContainer>
			),
		},
	];

	const currentMenu = useMemo(() => {
		const routeKeys = Object.keys(ROUTES) as (keyof typeof ROUTES)[];
		const currentRouteKey = routeKeys.find((key) => {
			const route = ROUTES[key];
			return pathname === route;
		});

		if (!currentRouteKey) return null;

		return ROUTES[currentRouteKey];
	}, [pathname]);

	const sidebarItems = (props: SidebarItem, index: number): SidebarItem => ({
		key: `${index}`,
		icon: props.icon,
		onClick: props.onClick,
		label: props.text,
	});

	return (
		<Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={200}>
			<Menu
				theme="dark"
				defaultSelectedKeys={[ROUTES.APPLICATION]}
				selectedKeys={currentMenu ? [currentMenu] : []}
				mode="vertical"
				style={styles}
				items={menus}
				onClick={onClickMenuHandler}
			/>
			{sidebar.map((props, index) => (
				<SlackMenuItemContainer
					index={index + 1}
					key={`${index + 1}`}
					collapsed={collapsed}
				>
					<Menu
						theme="dark"
						defaultSelectedKeys={[ROUTES.APPLICATION]}
						selectedKeys={currentMenu ? [currentMenu] : []}
						mode="inline"
						style={styles}
						items={[sidebarItems(props, index)]}
					/>
				</SlackMenuItemContainer>
			))}
		</Sider>
	);
}

interface SidebarItem {
	onClick: VoidFunction;
	icon?: ReactNode;
	text?: ReactNode;
	key: string;
	label?: ReactNode;
}

export default SideNav;
