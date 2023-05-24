import { Tabs, TabsProps } from 'antd';
import { History } from 'history';

function RouteTab({
	routes,
	activeKey,
	onChangeHandler,
	history,
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

	const items = routes.map(({ Component, name, route }) => ({
		label: name,
		key: name,
		tabKey: route,
		children: <Component />,
	}));

	return (
		<Tabs
			onChange={onChange}
			destroyInactiveTabPane
			activeKey={activeKey}
			animated
			items={items}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...rest}
		/>
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
	history: History<unknown>;
}

RouteTab.defaultProps = {
	onChangeHandler: undefined,
};

export default RouteTab;
