import { Tabs, TabsProps } from 'antd';
import React from 'react';

const { TabPane } = Tabs;
import history from 'lib/history';

const RouteTab = ({
	routes,
	activeKey,
	onChangeHandler,
	...rest
}: RouteTabProps & TabsProps): JSX.Element => {
	const onChange = (activeRoute: string) => {
		onChangeHandler && onChangeHandler();

		const selectedRoute = routes.find((e) => e.name === activeRoute);

		if (selectedRoute) {
			history.push(selectedRoute.route);
		}
	};

	return (
		<Tabs
			onChange={onChange}
			destroyInactiveTabPane
			activeKey={activeKey}
			{...rest}
		>
			{routes.map(
				({ Component, name }): JSX.Element => (
					<TabPane tab={name} key={name}>
						<Component />
					</TabPane>
				),
			)}
		</Tabs>
	);
};

interface RouteTabProps {
	routes: {
		name: string;
		route: string;
		Component: () => JSX.Element;
	}[];
	activeKey: TabsProps['activeKey'];
	onChangeHandler?: VoidFunction;
}

export default RouteTab;
