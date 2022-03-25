import { Tabs, TabsProps } from 'antd';
import history from 'lib/history';
import React from 'react';

const { TabPane } = Tabs;

function RouteTab({
	routes,
	activeKey,
	onChangeHandler,
	...rest
}: RouteTabProps & TabsProps): JSX.Element {
	const onChange = (activeRoute: string): void => {
		if (onChangeHandler) {
			onChangeHandler();
		}

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
			// eslint-disable-next-line react/jsx-props-no-spreading
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
}

interface RouteTabProps {
	routes: {
		name: string;
		route: string;
		Component: () => JSX.Element;
	}[];
	activeKey: TabsProps['activeKey'];
	onChangeHandler?: VoidFunction;
}

RouteTab.defaultProps = {
	onChangeHandler: undefined,
};

export default RouteTab;
