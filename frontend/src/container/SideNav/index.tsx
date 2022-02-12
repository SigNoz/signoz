import { Menu, Typography } from 'antd';
import { MenuItem, SlackButton, ToggleButton } from './styles';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ToggleDarkMode } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import AppReducer from 'types/reducer/app';
import getTheme from 'lib/theme/getTheme';
import setTheme from 'lib/theme/setTheme';

import menus from './menuItems';
import { Logo, Sider, ThemeSwitcherWrapper } from './styles';
import Slack from './Slack';

const SideNav = ({ toggleDarkMode }: Props): JSX.Element => {
	const [collapsed, setCollapsed] = useState<boolean>(false);
	const { pathname } = useLocation();
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);

	const toggleTheme = useCallback(() => {
		const preMode: appMode = isDarkMode ? 'lightMode' : 'darkMode';
		setTheme(preMode);

		const id: appMode = preMode;
		const head = document.head;
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

	const onClickHandler = useCallback(
		(to: string) => {
			if (pathname !== to) {
				history.push(to);
			}
		},
		[pathname],
	);

	const onClickSlackHandler = () => {
		window.open('https://signoz.io/slack', '_blank');
	};

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
				<Logo src={'/signoz.svg'} alt="SigNoz" collapsed={collapsed} />
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

				<MenuItem onClick={onClickSlackHandler} icon={<Slack />}>
					<SlackButton>Slack</SlackButton>
				</MenuItem>
			</Menu>
		</Sider>
	);
};

type appMode = 'darkMode' | 'lightMode';

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
