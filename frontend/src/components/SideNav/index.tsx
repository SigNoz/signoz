import { Layout, Menu, Switch as ToggleButton, Typography } from 'antd';
import ROUTES from 'constants/routes';
import React, { useCallback, useState } from 'react';
import { useThemeSwitcher } from 'react-css-theme-switcher';
import { NavLink } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

import { Logo, ThemeSwitcherWrapper } from './styles';
const { Sider } = Layout;
import history from 'lib/history';

import menus from './menuItems';

const SideNav = (): JSX.Element => {
	const { switcher, currentTheme, themes } = useThemeSwitcher();

	const [collapsed, setCollapsed] = useState<boolean>(false);
	const { pathname } = useLocation();

	const toggleTheme = useCallback(
		(isChecked: boolean) => {
			switcher({ theme: isChecked ? themes.dark : themes.light });
		},
		[switcher, themes],
	);

	const onCollapse = useCallback(() => {
		setCollapsed((collapsed) => !collapsed);
	}, []);

	const onClickHandler = useCallback((to: string) => {
		history.push(to);
	}, []);

	return (
		<Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={160}>
			<ThemeSwitcherWrapper>
				<ToggleButton
					checked={currentTheme === themes.dark}
					onChange={toggleTheme}
				/>
			</ThemeSwitcherWrapper>
			<NavLink to="/">
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

export default SideNav;
