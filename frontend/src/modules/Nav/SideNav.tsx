import React, { useState, useEffect } from 'react';
import { Layout, Menu, Switch as ToggleButton } from 'antd';
import { NavLink } from 'react-router-dom';
import { useThemeSwitcher } from 'react-css-theme-switcher';
import { useLocation } from 'react-router-dom';
import ROUTES from 'Src/constants/routes';

import {
	LineChartOutlined,
	BarChartOutlined,
	DeploymentUnitOutlined,
	AlignLeftOutlined,
	SettingOutlined,
	ApiOutlined,
} from '@ant-design/icons';
import { ThemeSwitcherWrapper } from './styles';
const { Sider } = Layout;

const SideNav = () => {
	const { switcher, currentTheme, status, themes } = useThemeSwitcher();
	const [collapsed, setCollapsed] = useState<boolean>(false);
	const [selectedKeys, setSelectedKeys] = useState<string[]>([
		ROUTES.APPLICATION,
	]);
	const location = useLocation();

	useEffect(() => {
		const newRoute = location.pathname.split('/')[1];
		setSelectedKeys([`/${newRoute}`]);
	}, [location.pathname]);

	if (status === 'loading' || location.pathname === ROUTES.SIGN_UP) {
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
						src={'/signoz.svg'}
						alt={'SigNoz'}
						style={{
							margin: '5%',
							width: 100,
							display: !collapsed ? 'block' : 'none',
						}}
					/>
				</NavLink>
			</div>

			<Menu
				theme="dark"
				defaultSelectedKeys={[ROUTES.APPLICATION]}
				selectedKeys={selectedKeys}
				mode="inline"
			>
				<Menu.Item key={ROUTES.APPLICATION} icon={<BarChartOutlined />}>
					<NavLink
						to={ROUTES.APPLICATION}
						style={{ fontSize: 12, textDecoration: 'none' }}
					>
						Metrics
					</NavLink>
				</Menu.Item>
				<Menu.Item key={ROUTES.TRACES} icon={<AlignLeftOutlined />}>
					<NavLink
						to={ROUTES.TRACES}
						style={{ fontSize: 12, textDecoration: 'none' }}
					>
						Traces
					</NavLink>
				</Menu.Item>
				<Menu.Item key={ROUTES.SERVICE_MAP} icon={<DeploymentUnitOutlined />}>
					<NavLink
						to={ROUTES.SERVICE_MAP}
						style={{ fontSize: 12, textDecoration: 'none' }}
					>
						Service Map
					</NavLink>
				</Menu.Item>
				<Menu.Item key={ROUTES.USAGE_EXPLORER} icon={<LineChartOutlined />}>
					<NavLink
						to={ROUTES.USAGE_EXPLORER}
						style={{ fontSize: 12, textDecoration: 'none' }}
					>
						Usage Explorer
					</NavLink>
				</Menu.Item>
				<Menu.Item key={ROUTES.SETTINGS} icon={<SettingOutlined />}>
					<NavLink
						to={ROUTES.SETTINGS}
						style={{ fontSize: 12, textDecoration: 'none' }}
					>
						Settings
					</NavLink>
				</Menu.Item>
				<Menu.Item key={ROUTES.INSTRUMENTATION} icon={<ApiOutlined />}>
					<NavLink
						to={ROUTES.INSTRUMENTATION}
						style={{ fontSize: 12, textDecoration: 'none' }}
					>
						Add instrumentation
					</NavLink>
				</Menu.Item>
			</Menu>
		</Sider>
	);
};

export default SideNav;
