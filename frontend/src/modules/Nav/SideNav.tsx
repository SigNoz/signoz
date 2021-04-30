import React, { useState } from "react";
import { Layout, Menu, Switch as ToggleButton } from "antd";
import { NavLink } from "react-router-dom";
import { useThemeSwitcher } from "react-css-theme-switcher";

import {
	LineChartOutlined,
	BarChartOutlined,
	DeploymentUnitOutlined,
	AlignLeftOutlined,
	SettingOutlined,
	ApiOutlined,
} from "@ant-design/icons";
import { ThemeSwitcherWrapper } from "./styles";
const { Sider } = Layout;

const SideNav = () => {
	const { switcher, currentTheme, status, themes } = useThemeSwitcher();
	const [collapsed, setCollapsed] = useState<boolean>(false);
	if (status === "loading") {
		return null;
	}
	const toggleTheme = (isChecked: boolean) => {
		switcher({ theme: isChecked ? themes.dark : themes.light });
	};

	const onCollapse = (): void => {
		setCollapsed(!collapsed);
	};
	return (
		<Sider collapsible collapsed={collapsed} onCollapse={onCollapse} width={160}>
			<div className="logo">
				<ThemeSwitcherWrapper>
					<ToggleButton
						checked={currentTheme === themes.dark}
						onChange={toggleTheme}
					/>
				</ThemeSwitcherWrapper>
				<NavLink to="/">
					<img
						src={"/signoz.svg"}
						alt={"SigNoz"}
						style={{
							margin: "5%",
							width: 100,
							display: !collapsed ? "block" : "none",
						}}
					/>
				</NavLink>
			</div>

			<Menu theme="dark" defaultSelectedKeys={["1"]} mode="inline">
				<Menu.Item key="1" icon={<BarChartOutlined />}>
					<NavLink
						to="/application"
						style={{ fontSize: 12, textDecoration: "none" }}
					>
						Metrics
					</NavLink>
				</Menu.Item>
				<Menu.Item key="2" icon={<AlignLeftOutlined />}>
					<NavLink to="/traces" style={{ fontSize: 12, textDecoration: "none" }}>
						Traces
					</NavLink>
				</Menu.Item>
				<Menu.Item key="3" icon={<DeploymentUnitOutlined />}>
					<NavLink
						to="/service-map"
						style={{ fontSize: 12, textDecoration: "none" }}
					>
						Service Map
					</NavLink>
				</Menu.Item>
				<Menu.Item key="4" icon={<LineChartOutlined />}>
					<NavLink
						to="/usage-explorer"
						style={{ fontSize: 12, textDecoration: "none" }}
					>
						Usage Explorer
					</NavLink>
				</Menu.Item>
				<Menu.Item key="5" icon={<SettingOutlined />}>
					<NavLink to="/settings" style={{ fontSize: 12, textDecoration: "none" }}>
						Settings
					</NavLink>
				</Menu.Item>
				<Menu.Item key="6" icon={<ApiOutlined />}>
					<NavLink
						to="/add-instrumentation"
						style={{ fontSize: 12, textDecoration: "none" }}
					>
						Add instrumentation
					</NavLink>
				</Menu.Item>
			</Menu>
		</Sider>
	);
};

export default SideNav;
