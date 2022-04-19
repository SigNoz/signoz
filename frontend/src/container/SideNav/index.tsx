import { CheckCircleTwoTone, WarningOutlined } from '@ant-design/icons';
import { Menu, Typography } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import setTheme, { AppMode } from 'lib/theme/setTheme';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connect, useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ToggleDarkMode } from 'store/actions';
import { SideBarCollapse } from 'store/actions/app';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import AppReducer from 'types/reducer/app';

import menus from './menuItems';
import Slack from './Slack';
import {
	Logo,
	RedDot,
	Sider,
	SlackButton,
	SlackMenuItemContainer,
	ThemeSwitcherWrapper,
	ToggleButton,
	VersionContainer,
} from './styles';

function SideNav({ toggleDarkMode }: Props): JSX.Element {
	const dispatch = useDispatch();
	const [collapsed, setCollapsed] = useState<boolean>(
		getLocalStorageKey(IS_SIDEBAR_COLLAPSED) === 'true',
	);
	const {
		isDarkMode,
		currentVersion,
		latestVersion,
		isCurrentVersionError,
	} = useSelector<AppState, AppReducer>((state) => state.app);

	const { pathname } = useLocation();
	const { t } = useTranslation('');

	const toggleTheme = useCallback(() => {
		const preMode: AppMode = isDarkMode ? 'lightMode' : 'darkMode';
		setTheme(preMode);

		const id: AppMode = preMode;
		const { head } = document;
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.href = !isDarkMode ? '/css/antd.dark.min.css' : '/css/antd.min.css';
		link.media = 'all';
		link.id = id;
		head.appendChild(link);

		link.onload = (): void => {
			toggleDarkMode();
			const prevNode = document.getElementById('appMode');
			prevNode?.remove();
		};
	}, [toggleDarkMode, isDarkMode]);

	const onCollapse = useCallback(() => {
		setCollapsed((collapsed) => !collapsed);
	}, []);

	useLayoutEffect(() => {
		dispatch(SideBarCollapse(collapsed));
	}, [collapsed, dispatch]);

	const onClickHandler = useCallback(
		(to: string) => {
			if (pathname !== to) {
				history.push(to);
			}
		},
		[pathname],
	);

	const onClickSlackHandler = (): void => {
		window.open('https://signoz.io/slack', '_blank');
	};

	const onClickVersionHandler = (): void => {
		history.push(ROUTES.VERSION);
	};

	const isNotCurrentVersion = currentVersion !== latestVersion;

	const sidebar = [
		{
			onClick: onClickSlackHandler,
			icon: <Slack />,
			text: <SlackButton>Support</SlackButton>,
		},
		{
			onClick: onClickVersionHandler,
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

	return (
		<Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={200}>
			<ThemeSwitcherWrapper>
				<ToggleButton
					checked={isDarkMode}
					onChange={toggleTheme}
					defaultChecked={isDarkMode}
				/>
			</ThemeSwitcherWrapper>
			<NavLink to={ROUTES.APPLICATION}>
				<Logo index={0} src="/signoz.svg" alt="SigNoz" collapsed={collapsed} />
			</NavLink>

			<Menu
				theme="dark"
				defaultSelectedKeys={[ROUTES.APPLICATION]}
				selectedKeys={[pathname]}
				mode="inline"
			>
				{menus.map(({ to, Icon, name }) => (
					<Menu.Item
						key={to}
						icon={<Icon />}
						onClick={(): void => onClickHandler(to)}
					>
						<Typography>{name}</Typography>
					</Menu.Item>
				))}
				{sidebar.map((props, index) => (
					<SlackMenuItemContainer
						index={index + 1}
						key={`${index + 1}`}
						collapsed={collapsed}
					>
						<Menu.Item
							eventKey={index.toString()}
							onClick={props.onClick}
							icon={props.icon}
						>
							{props.text}
						</Menu.Item>
					</SlackMenuItemContainer>
				))}
			</Menu>
		</Sider>
	);
}

interface DispatchProps {
	toggleDarkMode: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleDarkMode: bindActionCreators(ToggleDarkMode, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(SideNav);
