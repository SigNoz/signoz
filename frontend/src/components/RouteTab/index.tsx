import { Tabs, TabsProps } from 'antd';
import {
	generatePath,
	matchPath,
	useLocation,
	useParams,
} from 'react-router-dom';

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

	// Find the matching route for the current pathname
	const currentRoute = routes.find((route) => {
		const routePath = route.route.split('?')[0];
		return matchPath(location.pathname, {
			path: routePath,
			exact: true,
		});
	});

	const onChange = (activeRoute: string): void => {
		if (onChangeHandler) {
			onChangeHandler(activeRoute);
		}

		const selectedRoute = routes.find((e) => e.key === activeRoute);

		if (selectedRoute) {
			const resolvedRoute = generatePath(selectedRoute.route, params);
			history.push(resolvedRoute);
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
