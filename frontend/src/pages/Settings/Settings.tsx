import './Settings.styles.scss';

import logEvent from 'api/common/logEvent';
import RouteTab from 'components/RouteTab';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import { settingsMenuItems as defaultSettingsMenuItems } from 'container/SideNav/menuItems';
import NavItem from 'container/SideNav/NavItem/NavItem';
import { SidebarItem } from 'container/SideNav/sideNav.types';
import useComponentPermission from 'hooks/useComponentPermission';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import { Wrench } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { USER_ROLES } from 'types/roles';

import { getRoutes } from './utils';

function SettingsPage(): JSX.Element {
	const { pathname, search } = useLocation();

	const {
		user,
		featureFlags,
		trialInfo,
		isFetchingActiveLicense,
	} = useAppContext();
	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	const [settingsMenuItems, setSettingsMenuItems] = useState<SidebarItem[]>(
		defaultSettingsMenuItems,
	);

	const isAdmin = user.role === USER_ROLES.ADMIN;
	const isEditor = user.role === USER_ROLES.EDITOR;

	const isWorkspaceBlocked = trialInfo?.workSpaceBlock || false;

	const [isCurrentOrgSettings] = useComponentPermission(
		['current_org_settings'],
		user.role,
	);
	const { t } = useTranslation(['routes']);

	const isGatewayEnabled =
		featureFlags?.find((feature) => feature.name === FeatureKeys.GATEWAY)
			?.active || false;

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		setSettingsMenuItems((prevItems) => {
			let updatedItems = [...prevItems];

			if (trialInfo?.workSpaceBlock && !isFetchingActiveLicense) {
				updatedItems = updatedItems.map((item) => ({
					...item,
					isEnabled: !!(
						isAdmin &&
						(item.key === ROUTES.BILLING ||
							item.key === ROUTES.ORG_SETTINGS ||
							item.key === ROUTES.MY_SETTINGS ||
							item.key === ROUTES.SHORTCUTS)
					),
				}));

				return updatedItems;
			}

			if (isCloudUser) {
				if (isAdmin) {
					updatedItems = updatedItems.map((item) => ({
						...item,
						isEnabled:
							item.key === ROUTES.BILLING ||
							item.key === ROUTES.INTEGRATIONS ||
							item.key === ROUTES.CUSTOM_DOMAIN_SETTINGS ||
							item.key === ROUTES.API_KEYS ||
							item.key === ROUTES.INGESTION_SETTINGS ||
							item.key === ROUTES.ORG_SETTINGS ||
							item.key === ROUTES.SHORTCUTS
								? true
								: item.isEnabled,
					}));
				}

				if (isEditor) {
					updatedItems = updatedItems.map((item) => ({
						...item,
						isEnabled:
							item.key === ROUTES.INGESTION_SETTINGS ||
							item.key === ROUTES.INTEGRATIONS ||
							item.key === ROUTES.SHORTCUTS
								? true
								: item.isEnabled,
					}));
				}
			}

			if (isEnterpriseSelfHostedUser) {
				if (isAdmin) {
					updatedItems = updatedItems.map((item) => ({
						...item,
						isEnabled:
							item.key === ROUTES.BILLING ||
							item.key === ROUTES.INTEGRATIONS ||
							item.key === ROUTES.API_KEYS ||
							item.key === ROUTES.ORG_SETTINGS ||
							item.key === ROUTES.INGESTION_SETTINGS
								? true
								: item.isEnabled,
					}));
				}

				if (isEditor) {
					// eslint-disable-next-line sonarjs/no-identical-functions
					updatedItems = updatedItems.map((item) => ({
						...item,
						isEnabled:
							item.key === ROUTES.INTEGRATIONS ||
							item.key === ROUTES.INGESTION_SETTINGS
								? true
								: item.isEnabled,
					}));
				}
			}

			if (!isCloudUser && !isEnterpriseSelfHostedUser) {
				if (isAdmin) {
					updatedItems = updatedItems.map((item) => ({
						...item,
						isEnabled:
							item.key === ROUTES.API_KEYS || item.key === ROUTES.ORG_SETTINGS
								? true
								: item.isEnabled,
					}));
				}

				// disable billing and integrations for non-cloud users
				updatedItems = updatedItems.map((item) => ({
					...item,
					isEnabled:
						item.key === ROUTES.BILLING || item.key === ROUTES.INTEGRATIONS
							? false
							: item.isEnabled,
				}));
			}

			return updatedItems;
		});
	}, [
		isAdmin,
		isEditor,
		isCloudUser,
		isEnterpriseSelfHostedUser,
		isFetchingActiveLicense,
		trialInfo?.workSpaceBlock,
		pathname,
	]);

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
		onClickHandler(item?.key as string, event);
	};

	const isActiveNavItem = (key: string): boolean => {
		if (pathname.startsWith(ROUTES.ALL_CHANNELS) && key === ROUTES.ALL_CHANNELS) {
			return true;
		}

		if (
			pathname.startsWith(ROUTES.CHANNELS_EDIT) &&
			key === ROUTES.ALL_CHANNELS
		) {
			return true;
		}

		return pathname === key;
	};

	return (
		<div className="settings-page">
			<header className="settings-page-header">
				<div
					className="settings-page-header-title"
					data-testid="settings-page-title"
				>
					<Wrench size={16} />
					Settings
				</div>
			</header>

			<div className="settings-page-content-container">
				<div className="settings-page-sidenav" data-testid="settings-page-sidenav">
					{settingsMenuItems
						.filter((item) => item.isEnabled)
						.map((item) => (
							<NavItem
								key={item.key}
								item={item}
								isActive={isActiveNavItem(item.key as string)}
								isDisabled={false}
								showIcon={false}
								onClick={(event): void => {
									logEvent('Settings V2: Menu clicked', {
										menuLabel: item.label,
										menuRoute: item.key,
									});
									handleMenuItemClick((event as unknown) as MouseEvent, item);
								}}
								dataTestId={item.itemKey}
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
