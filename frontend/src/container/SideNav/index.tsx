import { Menu, Switch as ToggleButton, Typography } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useCallback, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GlobalTimeLoading, ToggleDarkMode } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import AppReducer from 'types/reducer/app';

import menus from './menuItems';
import { Logo, Sider, ThemeSwitcherWrapper } from './styles';

const SideNav = ({ toggleDarkMode, globalTimeLoading }: Props): JSX.Element => {
	const [collapsed, setCollapsed] = useState<boolean>(false);
	const { pathname } = useLocation();
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);

	const toggleTheme = useCallback(() => {
		const preMode: mode = isDarkMode ? 'lightMode' : 'darkMode';
		const postMode: mode = isDarkMode ? 'darkMode' : 'lightMode';

		const id: mode = preMode;
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
			const prevNode = document.getElementById(postMode);
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
				globalTimeLoading();
			}
		},
		[pathname, globalTimeLoading],
	);

	return (
		<Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={200}>
			<ThemeSwitcherWrapper>
				<ToggleButton checked={isDarkMode} onChange={toggleTheme} />
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
					<Menu.Item key={to} icon={<Icon />}>
						<div onClick={(): void => onClickHandler(to)}>
							<Typography>{name}</Typography>
						</div>
					</Menu.Item>
				))}
			</Menu>
		</Sider>
	);
};

type mode = 'darkMode' | 'lightMode';

interface DispatchProps {
	toggleDarkMode: () => void;
	globalTimeLoading: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleDarkMode: bindActionCreators(ToggleDarkMode, dispatch),
	globalTimeLoading: bindActionCreators(GlobalTimeLoading, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(SideNav);
