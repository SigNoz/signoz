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

	return (
		<Layout style={{ minHeight: '100vh' }}>
			<Sider width={200} style={{ background: '#fff' }}>
				<Menu
					mode="inline"
					selectedKeys={[currentComponent]}
					style={{ height: '100%', borderRight: 0 }}
				>
					{routes.map((route) => {
						console.log(route);
						return (
							<Menu.Item
								key={route.key}
								onClick={(): void => handleMenuItemClick(route.key)}
							>
								{route.name}
							</Menu.Item>
						);
					})}
				</Menu>
			</Sider>
			<Layout style={{ padding: '0 24px 24px' }}>
				<Content
					style={{
						padding: 24,
						margin: 0,
						minHeight: 280,
					}}
				>
					{routes.find((route) => route.key === currentComponent)?.Component &&
						routes.find((route) => route.key === currentComponent)?.Component()}
				</Content>
			</Layout>
		</Layout>
	);
}

export default SettingsNavItems;
