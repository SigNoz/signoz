import React, { useState, useCallback } from "react";
import { Layout, Menu, Switch as ToggleButton } from "antd";
import { NavLink } from "react-router-dom";
import { useThemeSwitcher } from "react-css-theme-switcher";
import { useLocation } from "react-router-dom";
import ROUTES from "constants/routes";

import { ThemeSwitcherWrapper, Logo } from "./styles";
const { Sider } = Layout;
import menus from "./menuItems";

const SideNav = (): JSX.Element => {
	const { switcher, currentTheme, themes } = useThemeSwitcher();

	const [collapsed, setCollapsed] = useState<boolean>(false);
	const { pathname } = useLocation();

	const toggleTheme = useCallback((isChecked: boolean) => {
		switcher({ theme: isChecked ? themes.dark : themes.light });
	}, []);

	const onCollapse = useCallback(() => {
		setCollapsed((collapsed) => !collapsed);
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
				<Logo src={"/signoz.svg"} alt="SigNoz" collapsed={collapsed} />
			</NavLink>

			<Menu
				theme="dark"
				defaultSelectedKeys={[ROUTES.APPLICATION]}
				selectedKeys={[pathname]}
				mode="inline"
			>
				{menus.map(({ to, Icon, name }) => (
					<Menu.Item key={to} icon={<Icon />}>
						<NavLink to={to} style={{ fontSize: 12, textDecoration: "none" }}>
							{name}
						</NavLink>
					</Menu.Item>
				))}
			</Menu>
		</Sider>
	);
};

export default SideNav;
