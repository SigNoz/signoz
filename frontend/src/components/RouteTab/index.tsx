import { Tabs, TabsProps } from 'antd';
import { useLocation, useParams } from 'react-router-dom';

import { RouteTabProps } from './types';

interface Params {
	[key: string]: string;
}

function RouteTab({
	routes,
	activeKey,
	onChangeHandler,
	history,
	...rest
}: RouteTabProps & TabsProps): JSX.Element {
	const params = useParams<Params>();
	const location = useLocation();

	// Replace dynamic parameters in routes
	const routesWithParams = routes.map((route) => ({
		...route,
		route: route.route.replace(
			/:(\w+)/g,
			(match, param) => params[param] || match,
		),
	}));

	// Find the matching route for the current pathname
	const currentRoute = routesWithParams.find((route) => {
		const routePattern = route.route.replace(/:(\w+)/g, '([^/]+)');
		const regex = new RegExp(`^${routePattern}$`);
		return regex.test(location.pathname);
	});

	const onChange = (activeRoute: string): void => {
		if (onChangeHandler) {
			onChangeHandler(activeRoute);
		}

		const selectedRoute = routesWithParams.find((e) => e.key === activeRoute);

		if (selectedRoute) {
			history.push(selectedRoute.route);
		}
	};

	const items = routesWithParams.map(({ Component, name, route, key }) => ({
		label: name,
		key,
		tabKey: route,
		children: <Component />,
	}));

	return (
		<Tabs
			onChange={onChange}
			destroyInactiveTabPane
			activeKey={currentRoute?.key || activeKey}
			defaultActiveKey={currentRoute?.key || activeKey}
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
