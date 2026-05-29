import './RouteTab.styles.scss';

import {
	generatePath,
	matchPath,
	useLocation,
	useParams,
} from 'react-router-dom';
import {
	TabsContent,
	TabsList,
	TabsRoot,
	TabsTrigger,
} from '@signozhq/ui/tabs';
import HeaderRightSection from 'components/HeaderRightSection/HeaderRightSection';

import { RouteTabProps } from './types';

interface Params {
	[key: string]: string;
}

function RouteTab({
	routes,
	activeKey,
	defaultActiveKey,
	onChangeHandler,
	history,
	showRightSection = true,
	tabBarExtraContent,
	hideTabBar = false,
}: RouteTabProps): JSX.Element {
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

	const resolvedActiveKey = currentRoute?.key || activeKey;
	const extraContent =
		tabBarExtraContent ??
		(showRightSection && (
			<HeaderRightSection enableAnnouncements={false} enableShare enableFeedback />
		));

	return (
		<TabsRoot
			value={resolvedActiveKey}
			defaultValue={defaultActiveKey ?? resolvedActiveKey}
			onValueChange={onChange}
		>
			{!hideTabBar && (
				<div className="route-tab-header">
					<TabsList>
						{routes.map(({ name, key }) => (
							<TabsTrigger key={key} value={key}>
								{name}
							</TabsTrigger>
						))}
					</TabsList>
					{extraContent && <div className="route-tab-extra">{extraContent}</div>}
				</div>
			)}
			{routes.map(({ key, Component }) => (
				<TabsContent key={key} value={key}>
					<Component />
				</TabsContent>
			))}
		</TabsRoot>
	);
}

export default RouteTab;
