import './Settings.styles.scss';

import { Layout, Menu } from 'antd';
import { Content } from 'antd/es/layout/layout';
import { TabRoutes } from 'components/RouteTab/types';
import { Sider } from 'container/SideNav/styles';
import { History } from 'history';
import { useState } from 'react';

function SettingsNavItems({
	routes,
	activeKey,
	history,
}: {
	routes: TabRoutes[];
	activeKey: string;
	history: History<unknown>;
}): JSX.Element {
	const [currentComponent, setCurrentComponent] = useState(activeKey);

	const handleMenuItemClick = (key: string): void => {
		setCurrentComponent(key);
		history.push(key);
	};

	const renderComponent = (): JSX.Element | null => {
		const selectedRoute = routes.find((route) => route.key === currentComponent);
		return selectedRoute?.Component ? <selectedRoute.Component /> : null;
	};

	return (
		<Layout className="settings-layout">
			<Sider width={240}>
				<Menu
					mode="inline"
					selectedKeys={[currentComponent]}
					className="settings-menu"
				>
					{routes.map((route) => (
						<Menu.Item
							key={route.key}
							onClick={(): void => handleMenuItemClick(route.key)}
						>
							{route.name}
						</Menu.Item>
					))}
				</Menu>
			</Sider>
			<Layout className="settings-content-layout">
				<Content className="settings-content">{renderComponent()}</Content>
			</Layout>
		</Layout>
	);
}

export default SettingsNavItems;
