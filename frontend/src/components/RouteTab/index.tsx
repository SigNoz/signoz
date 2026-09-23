import { Tabs, TabsProps } from 'antd';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import { buildRoutePath } from 'lib/router/buildRoutePath';
import { matchRoute } from 'lib/router/matchRoute';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { useAppParams } from 'lib/router/useAppParams';

import { RouteTabProps } from './types';

interface Params {
	[key: string]: string;
}

function RouteTab({
	routes,
	activeKey,
	onChangeHandler,
	showRightSection,
	...rest
}: RouteTabProps & TabsProps): JSX.Element {
	const params = useAppParams<Params>();
	const location = useAppLocation();

	// Find the matching route for the current pathname
	const currentRoute = routes.find((route) => {
		const routePath = route.route.split('?')[0];
		return matchRoute(location.pathname, routePath, { exact: true });
	});

	const onChange = (activeRoute: string): void => {
		if (onChangeHandler) {
			onChangeHandler(activeRoute);
		}

		const selectedRoute = routes.find((e) => e.key === activeRoute);

		if (selectedRoute) {
			const resolvedRoute = buildRoutePath(
				selectedRoute.route,
				Object.fromEntries(
					Object.entries(params).filter(([, v]) => v !== undefined),
				) as Record<string, string>,
			);
			navigate(resolvedRoute);
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
			tabBarExtraContent={
				showRightSection && (
					<HeaderRightSection
						enableAnnouncements={false}
						enableShare
						enableFeedback
					/>
				)
			}
			{...rest}
		/>
	);
}

RouteTab.defaultProps = {
	onChangeHandler: undefined,
	showRightSection: true,
};

export default RouteTab;
