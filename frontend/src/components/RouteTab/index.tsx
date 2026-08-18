import { Tabs, TabsProps } from 'antd';
import cx from 'classnames';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { buildRoutePath } from 'lib/router/buildRoutePath';
import { matchRoute } from 'lib/router/matchRoute';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { useAppParams } from 'lib/router/useAppParams';

import { RouteTabProps } from './types';

import styles from './RouteTab.module.scss';

interface Params {
	[key: string]: string;
}

/**
 * Each pane scrolls its own content inside an OverlayScrollbar, so the tab bar
 * stays put. Mounted as the page root the pane is bounded to the viewport; inside
 * a plain block wrapper the scroller is inert and the page scrolls as usual.
 * Pane content that needs a bounded box must size itself with `height: 100%`
 * (the scroller's viewport is block flow, so `flex: 1` has no effect there).
 */
function RouteTab({
	routes,
	activeKey,
	onChangeHandler,
	showRightSection,
	className,
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
			navigate(buildRoutePath(selectedRoute.route, params));
		}
	};

	const items = routes.map(({ Component, name, route, key }) => ({
		label: name,
		key,
		tabKey: route,
		children: (
			<OverlayScrollbar>
				<Component />
			</OverlayScrollbar>
		),
	}));

	return (
		<Tabs
			className={cx(styles.routeTab, className)}
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
