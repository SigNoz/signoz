import './Settings.styles.scss';

import RouteTab from 'components/RouteTab';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import { settingsMenuItems } from 'container/SideNav/menuItems';
import NavItem from 'container/SideNav/NavItem/NavItem';
import { SidebarItem } from 'container/SideNav/sideNav.types';
import { getActiveMenuKeyFromPath } from 'container/SideNav/sideNav.utils';
import useComponentPermission from 'hooks/useComponentPermission';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import { Wrench } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { getRoutes } from './utils';

function SettingsPage(): JSX.Element {
	const { pathname, search } = useLocation();
	const activeMenuKey = useMemo(() => getActiveMenuKeyFromPath(pathname), [
		pathname,
	]);

	const { user, featureFlags, trialInfo } = useAppContext();
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	const isWorkspaceBlocked = trialInfo?.workSpaceBlock || false;

	const [isCurrentOrgSettings] = useComponentPermission(
		['current_org_settings'],
		user.role,
	);
	const { t } = useTranslation(['routes']);

	const isGatewayEnabled =
		featureFlags?.find((feature) => feature.name === FeatureKeys.GATEWAY)
			?.active || false;

	const routes = useMemo(
		() =>
			getRoutes(
				user.role,
				isCurrentOrgSettings,
				isGatewayEnabled,
				isWorkspaceBlocked,
				isCloudUser,
				isEnterpriseSelfHostedUser,
				t,
			),
		[
			user.role,
			isCurrentOrgSettings,
			isGatewayEnabled,
			isWorkspaceBlocked,
			isCloudUser,
			isEnterpriseSelfHostedUser,
			t,
		],
	);

	const settingsRoute = isCurrentOrgSettings
		? ROUTES.ORG_SETTINGS
		: ROUTES.SETTINGS;

	const isCtrlMetaKey = (e: MouseEvent): boolean => e.ctrlKey || e.metaKey;

	const openInNewTab = (path: string): void => {
		window.open(path, '_blank');
	};

	const onClickHandler = useCallback(
		(key: string, event: MouseEvent | null) => {
			const params = new URLSearchParams(search);
			const availableParams = routeConfig[key];

			const queryString = getQueryString(availableParams || [], params);

			if (pathname !== key) {
				if (event && isCtrlMetaKey(event)) {
					openInNewTab(`${key}?${queryString.join('&')}`);
				} else {
					history.push(`${key}?${queryString.join('&')}`, {
						from: pathname,
					});
				}
			}
		},
		[pathname, search],
	);

	const handleMenuItemClick = (event: MouseEvent, item: SidebarItem): void => {
		if (item.key === ROUTES.SETTINGS) {
			if (isCtrlMetaKey(event)) {
				openInNewTab(settingsRoute);
			} else {
				history.push(settingsRoute);
			}
		} else if (item) {
			onClickHandler(item?.key as string, event);
		}
	};

	console.log('routes', routes, pathname);

	return (
		<div className="settings-page">
			<header className="settings-page-header">
				<div className="settings-page-header-title">
					<Wrench size={16} />
					Settings
				</div>
			</header>

			<div className="settings-page-content-container">
				<div className="settings-page-sidenav">
					{settingsMenuItems.map((item) => (
						<NavItem
							key={item.key}
							item={item}
							isActive={activeMenuKey === item.key}
							isDisabled={false}
							showIcon={false}
							onClick={(event): void => {
								handleMenuItemClick((event as unknown) as MouseEvent, item);
							}}
						/>
					))}
				</div>

				<div className="settings-page-content">
					<RouteTab
						routes={routes}
						activeKey={pathname}
						history={history}
						tabBarStyle={{ display: 'none' }}
					/>
				</div>
			</div>
		</div>
	);
}

export default SettingsPage;
