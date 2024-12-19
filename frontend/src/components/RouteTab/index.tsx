import { Tabs, TabsProps } from 'antd';

import { RouteTabProps } from './types';

function RouteTab({
	routes,
	activeKey,
	onChangeHandler,
	history,
	...rest
}: RouteTabProps & TabsProps): JSX.Element {
	const onChange = (activeRoute: string): void => {
		if (onChangeHandler) {
			onChangeHandler(activeRoute);
		}

		const selectedRoute = routes.find((e) => e.key === activeRoute);

		if (selectedRoute) {
			history.push(selectedRoute.route);
		}
	};

	const items = routes.map(({ Component, name, route, key }) => ({
		label: name,
		key,
		tabKey: route,
		children: <Component />,
	}));

	return (
		<Tabs
			onChange={onChange}
			destroyInactiveTabPane
			activeKey={activeKey}
			defaultActiveKey={activeKey}
			animated
			items={items}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...rest}
		/>
	);
}

RouteTab.defaultProps = {
	onChangeHandler: undefined,
};

export default RouteTab;
