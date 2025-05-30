/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './SideNav.styles.scss';

import {
	closestCenter,
	DndContext,
	DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Dropdown, MenuProps, Modal, Tooltip } from 'antd';
import logEvent from 'api/common/logEvent';
import { Logout } from 'api/utils';
import cx from 'classnames';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { GlobalShortcuts } from 'constants/shortcuts/globalShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import useComponentPermission from 'hooks/useComponentPermission';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import history from 'lib/history';
import {
	Check,
	ChevronDown,
	ChevronUp,
	Cog,
	Ellipsis,
	GripVertical,
	Logs,
	MousePointerClick,
	PackagePlus,
	X,
} from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { LicenseStatus } from 'types/api/licensesV3/getActive';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';
import { checkVersionState } from 'utils/app';

import { routeConfig } from './config';
import { getQueryString } from './helper';
import {
	defaultMoreMenuItems,
	helpSupportDropdownMenuItems as DefaultHelpSupportDropdownMenuItems,
	helpSupportMenuItem,
	primaryMenuItems,
} from './menuItems';
import NavItem from './NavItem/NavItem';
import { SidebarItem } from './sideNav.types';
import { getActiveMenuKeyFromPath } from './sideNav.utils';

function SortableFilter({ item }: { item: SidebarItem }): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({ id: item.key });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div ref={setNodeRef} style={style} className="reorder-shortcut-nav-item">
			<div
				{...attributes}
				{...listeners}
				className="reorder-shortcut-nav-item drag-handle"
				key={item.key}
			>
				<div className="reorder-shortcut-nav-item-grab-icon">
					<GripVertical size={16} />
				</div>

				<div className="reorder-shortcut-nav-item-icon">{item.icon}</div>

				<div className="reorder-shortcut-nav-item-label">{item.label}</div>
			</div>
		</div>
	);
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function SideNav({ isPinned }: { isPinned: boolean }): JSX.Element {
	const { pathname, search } = useLocation();
	const { currentVersion, latestVersion, isCurrentVersionError } = useSelector<
		AppState,
		AppReducer
	>((state) => state.app);

	const { user, featureFlags, trialInfo, isLoggedIn } = useAppContext();

	const [
		helpSupportDropdownMenuItems,
		setHelpSupportDropdownMenuItems,
	] = useState<SidebarItem[]>(DefaultHelpSupportDropdownMenuItems);

	const [pinnedMenuItems, setPinnedMenuItems] = useState<SidebarItem[]>(
		defaultMoreMenuItems.filter((item) => item.isPinned),
	);

	const [tempPinnedMenuItems, setTempPinnedMenuItems] = useState<SidebarItem[]>(
		[],
	);

	const [secondaryMenuItems, setSecondaryMenuItems] = useState<SidebarItem[]>(
		defaultMoreMenuItems,
	);

	const isOnboardingV3Enabled = featureFlags?.find(
		(flag) => flag.name === FeatureKeys.ONBOARDING_V3,
	)?.active;

	const isChatSupportEnabled = featureFlags?.find(
		(flag) => flag.name === FeatureKeys.CHAT_SUPPORT,
	)?.active;

	const isPremiumSupportEnabled = featureFlags?.find(
		(flag) => flag.name === FeatureKeys.PREMIUM_SUPPORT,
	)?.active;

	const [licenseTag, setLicenseTag] = useState('');
	const isAdmin = user.role === USER_ROLES.ADMIN;

	const userSettingsMenuItem = {
		key: ROUTES.SETTINGS,
		label: 'Settings',
		icon: <Cog size={16} />,
	};

	const isCtrlMetaKey = (e: MouseEvent): boolean => e.ctrlKey || e.metaKey;

	const isLatestVersion = checkVersionState(currentVersion, latestVersion);

	const [
		showVersionUpdateNotification,
		setShowVersionUpdateNotification,
	] = useState(false);

	const [isMoreMenuCollapsed, setIsMoreMenuCollapsed] = useState(false);

	const [
		isReorderShortcutNavItemsModalOpen,
		setIsReorderShortcutNavItemsModalOpen,
	] = useState(false);

	const handleDragEnd = (event: DragEndEvent): void => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setTempPinnedMenuItems((items) => {
				const oldIndex = items.findIndex((item) => item.key === active.id);
				const newIndex = items.findIndex((item) => item.key === over.id);

				return arrayMove(items, oldIndex, newIndex);
			});
		}
	};

	const handleReorderShortcutNavItems = (): void => {
		setPinnedMenuItems(tempPinnedMenuItems);
		setIsReorderShortcutNavItemsModalOpen(false);
	};

	const hideReorderShortcutNavItemsModal = (): void => {
		setIsReorderShortcutNavItemsModalOpen(false);
	};

	useEffect(() => {
		if (isReorderShortcutNavItemsModalOpen) {
			setTempPinnedMenuItems(pinnedMenuItems);
		}
	}, [isReorderShortcutNavItemsModalOpen, pinnedMenuItems]);

	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	const {
		isCloudUser,
		isEnterpriseSelfHostedUser,
		isCommunityUser,
		isCommunityEnterpriseUser,
	} = useGetTenantLicense();

	const isWorkspaceBlocked = trialInfo?.workSpaceBlock || false;

	const openInNewTab = (path: string): void => {
		window.open(path, '_blank');
	};

	const onClickGetStarted = (event: MouseEvent): void => {
		logEvent('Sidebar: Menu clicked', {
			menuRoute: '/get-started',
			menuLabel: 'Get Started',
		});

		const onboaringRoute = isOnboardingV3Enabled
			? ROUTES.GET_STARTED_WITH_CLOUD
			: ROUTES.GET_STARTED;

		if (isCtrlMetaKey(event)) {
			openInNewTab(onboaringRoute);
		} else {
			history.push(onboaringRoute);
		}
	};

	const onTogglePin = useCallback((item: SidebarItem): void => {
		setSecondaryMenuItems((prevItems) =>
			prevItems.map((i) => {
				if (i.key === item.key) {
					return { ...i, isPinned: !i.isPinned };
				}
				return i;
			}),
		);

		setPinnedMenuItems((prevItems) => {
			if (prevItems?.some((i) => i.key === item.key)) {
				return prevItems?.filter((i) => i.key !== item.key);
			}
			return [item, ...(prevItems || [])];
		});
	}, []);

	const sensors = useSensors(useSensor(PointerSensor));

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

	const activeMenuKey = useMemo(() => getActiveMenuKeyFromPath(pathname), [
		pathname,
	]);

	const userSettingsDropdownMenuItems: MenuProps['items'] = useMemo(
		() =>
			[
				{
					key: 'label',
					label: (
						<div className="user-settings-dropdown-logged-in-section">
							<span className="user-settings-dropdown-label-text">LOGGED IN AS</span>
							<span className="user-settings-dropdown-label-email">{user.email}</span>
						</div>
					),
					disabled: true,
				},
				{ type: 'divider' as const },
				{
					key: 'account',
					label: 'Account Settings',
				},
				{
					key: 'workspace',
					label: 'Workspace Settings',
				},
				...(isEnterpriseSelfHostedUser
					? [
							{
								key: 'license',
								label: 'Manage License',
							},
					  ]
					: []),
				{ type: 'divider' as const },
				{
					key: 'logout',
					label: (
						<span className="user-settings-dropdown-logout-section">Sign out</span>
					),
				},
			].filter(Boolean),
		[isEnterpriseSelfHostedUser, user.email],
	);

	useEffect(() => {
		if (isCloudUser) {
			setLicenseTag('Cloud');
		} else if (isEnterpriseSelfHostedUser) {
			setLicenseTag('Enterprise');
		} else if (isCommunityEnterpriseUser) {
			setLicenseTag('Enterprise');
		} else if (isCommunityUser) {
			setLicenseTag('Community');
		}
	}, [
		isCloudUser,
		isEnterpriseSelfHostedUser,
		isCommunityEnterpriseUser,
		isCommunityUser,
	]);

	useEffect(() => {
		if (!isAdmin) {
			setHelpSupportDropdownMenuItems((prevState) =>
				prevState.filter((item) => item.key !== 'invite-collaborators'),
			);
		}

		const showAddCreditCardModal =
			!isPremiumSupportEnabled && !trialInfo?.trialConvertedToSubscription;

		if (
			!(
				isLoggedIn &&
				isChatSupportEnabled &&
				!showAddCreditCardModal &&
				(isCloudUser || isEnterpriseSelfHostedUser)
			)
		) {
			setHelpSupportDropdownMenuItems((prevState) =>
				prevState.filter((item) => item.key !== 'chat-support'),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isAdmin,
		isChatSupportEnabled,
		isPremiumSupportEnabled,
		isCloudUser,
		trialInfo,
	]);

	const [isCurrentOrgSettings] = useComponentPermission(
		['current_org_settings'],
		user.role,
	);

	const settingsRoute = isCurrentOrgSettings
		? ROUTES.ORG_SETTINGS
		: ROUTES.SETTINGS;

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
		logEvent('Sidebar: Menu clicked', {
			menuRoute: item?.key,
			menuLabel: item?.label,
		});
	};

	useEffect(() => {
		registerShortcut(GlobalShortcuts.NavigateToServices, () =>
			onClickHandler(ROUTES.APPLICATION, null),
		);
		registerShortcut(GlobalShortcuts.NavigateToTraces, () =>
			onClickHandler(ROUTES.TRACE, null),
		);

		registerShortcut(GlobalShortcuts.NavigateToLogs, () =>
			onClickHandler(ROUTES.LOGS, null),
		);

		registerShortcut(GlobalShortcuts.NavigateToDashboards, () =>
			onClickHandler(ROUTES.ALL_DASHBOARD, null),
		);

		registerShortcut(GlobalShortcuts.NavigateToMessagingQueues, () =>
			onClickHandler(ROUTES.MESSAGING_QUEUES_OVERVIEW, null),
		);

		registerShortcut(GlobalShortcuts.NavigateToAlerts, () =>
			onClickHandler(ROUTES.LIST_ALL_ALERT, null),
		);
		registerShortcut(GlobalShortcuts.NavigateToExceptions, () =>
			onClickHandler(ROUTES.ALL_ERROR, null),
		);

		return (): void => {
			deregisterShortcut(GlobalShortcuts.NavigateToServices);
			deregisterShortcut(GlobalShortcuts.NavigateToTraces);
			deregisterShortcut(GlobalShortcuts.NavigateToLogs);
			deregisterShortcut(GlobalShortcuts.NavigateToDashboards);
			deregisterShortcut(GlobalShortcuts.NavigateToAlerts);
			deregisterShortcut(GlobalShortcuts.NavigateToExceptions);
			deregisterShortcut(GlobalShortcuts.NavigateToMessagingQueues);
		};
	}, [deregisterShortcut, onClickHandler, registerShortcut]);

	// // eslint-disable-next-line sonarjs/cognitive-complexity
	// useEffect(() => {
	// 	let updatedMenuItems = defaultMenuItems;
	// 	let updatedUserManagementItems: UserManagementMenuItems[] = [
	// 		manageLicenseMenuItem,
	// 	];

	// 	if (isCloudUser || isEnterpriseSelfHostedUser) {
	// 		const isOnboardingEnabled =
	// 			featureFlags?.find((feature) => feature.name === FeatureKeys.ONBOARDING)
	// 				?.active || false;

	// 		if (!isOnboardingEnabled) {
	// 			updatedMenuItems = updatedMenuItems.filter(
	// 				(item) =>
	// 					item.key !== ROUTES.GET_STARTED &&
	// 					item.key !== ROUTES.ONBOARDING &&
	// 					item.key !== ROUTES.GET_STARTED_WITH_CLOUD,
	// 			);
	// 		}

	// 		const isOnBasicPlan =
	// 			(activeLicenseFetchError &&
	// 				[StatusCodes.NOT_FOUND, StatusCodes.NOT_IMPLEMENTED].includes(
	// 					activeLicenseFetchError?.getHttpStatusCode(),
	// 				)) ||
	// 			(activeLicense?.status && activeLicense.status === LicenseStatus.INVALID);

	// 		if (user.role !== USER_ROLES.ADMIN || isOnBasicPlan) {
	// 			updatedMenuItems = updatedMenuItems.filter(
	// 				(item) => item.key !== ROUTES.BILLING,
	// 			);
	// 		}

	// 		updatedUserManagementItems = [helpSupportMenuItem];

	// 		// Show manage license menu item for EE cloud users with a active license
	// 		if (isEnterpriseSelfHostedUser) {
	// 			updatedUserManagementItems.push(manageLicenseMenuItem);
	// 		}
	// 	} else {
	// 		updatedMenuItems = updatedMenuItems.filter(
	// 			(item) => item.key !== ROUTES.INTEGRATIONS && item.key !== ROUTES.BILLING,
	// 		);
	// 		const versionMenuItem = {
	// 			key: SecondaryMenuItemKey.Version,
	// 			label: !isCurrentVersionError ? currentVersion : t('n_a'),
	// 			icon: !isLatestVersion ? (
	// 				<AlertTriangle color={Color.BG_CHERRY_600} size={16} />
	// 			) : (
	// 				<CheckSquare color={Color.BG_FOREST_500} size={16} />
	// 			),
	// 			onClick: onClickVersionHandler,
	// 		};

	// 		updatedUserManagementItems = [versionMenuItem, slackSupportMenuItem];

	// 		if (isCommunityEnterpriseUser) {
	// 			updatedUserManagementItems.push(manageLicenseMenuItem);
	// 		}
	// 	}
	// 	setMenuItems(updatedMenuItems);
	// }, [
	// 	isCommunityEnterpriseUser,
	// 	currentVersion,
	// 	featureFlags,
	// 	isCloudUser,
	// 	isEnterpriseSelfHostedUser,
	// 	isCurrentVersionError,
	// 	isLatestVersion,
	// 	onClickVersionHandler,
	// 	t,
	// 	user.role,
	// 	activeLicenseFetchError,
	// 	activeLicense?.status,
	// ]);

	const isPinnedItem = useMemo(
		() => (item: SidebarItem): boolean =>
			secondaryMenuItems.some((i) => i.key === item.key && i.isPinned),
		[secondaryMenuItems],
	);

	const moreMenuItems = useMemo(
		() => secondaryMenuItems.filter((i) => !i.isPinned),
		[secondaryMenuItems],
	);

	const renderNavItems = (
		items: SidebarItem[],
		allowPin?: boolean,
	): JSX.Element => (
		<>
			{items.map((item, index) => (
				<NavItem
					showIcon
					key={item.key || index}
					item={item}
					isActive={activeMenuKey === item.key}
					isDisabled={
						isWorkspaceBlocked &&
						item.key !== ROUTES.BILLING &&
						item.key !== ROUTES.SETTINGS
					}
					onTogglePin={allowPin ? onTogglePin : undefined}
					onClick={(event): void => {
						handleMenuItemClick(event, item);
					}}
					isPinned={isPinnedItem(item)}
				/>
			))}
		</>
	);

	const handleHelpSupportMenuItemClick = (info: SidebarItem): void => {
		const item = helpSupportDropdownMenuItems.find(
			(item) => item.key === info.key,
		);

		if (item?.isExternal && item?.url) {
			window.open(item.url, '_blank');
		}

		switch (item?.key) {
			case ROUTES.SHORTCUTS:
				history.push(ROUTES.SHORTCUTS);
				break;
			case 'invite-collaborators':
				history.push(`${ROUTES.ORG_SETTINGS}#invite-team-members`);
				break;
			case 'chat-support':
				if (window.pylon) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					window.Pylon('show');
				}
				break;
			default:
				break;
		}
	};

	const handleSettingsMenuItemClick = (info: SidebarItem): void => {
		switch (info.key) {
			case 'account':
				history.push(ROUTES.MY_SETTINGS);
				break;
			case 'workspace':
				history.push(ROUTES.SETTINGS);
				break;
			case 'license':
				history.push(ROUTES.LIST_LICENSES);
				break;
			case 'logout':
				Logout();
				break;
			default:
		}
	};

	useEffect(() => {
		if (isCloudUser || isEnterpriseSelfHostedUser) {
			// enable integrations for cloud users
			setSecondaryMenuItems((prevItems) =>
				prevItems.map((item) => ({
					...item,
					isEnabled: item.key === ROUTES.INTEGRATIONS ? true : item.isEnabled,
				})),
			);

			// enable integrations for pinned menu items
			// eslint-disable-next-line sonarjs/no-identical-functions
			setPinnedMenuItems((prevItems) =>
				prevItems.map((item) => ({
					...item,
					isEnabled: item.key === ROUTES.INTEGRATIONS ? true : item.isEnabled,
				})),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isCloudUser, isEnterpriseSelfHostedUser]);

	const onClickVersionHandler = useCallback((event: MouseEvent): void => {
		if (isCtrlMetaKey(event)) {
			openInNewTab(ROUTES.VERSION);
		} else {
			history.push(ROUTES.VERSION);
		}
	}, []);

	useEffect(() => {
		if (!isLatestVersion && !isCloudUser && !isEnterpriseSelfHostedUser) {
			setShowVersionUpdateNotification(true);
		} else {
			setShowVersionUpdateNotification(false);
		}
	}, [
		currentVersion,
		latestVersion,
		isCurrentVersionError,
		isLatestVersion,
		isCloudUser,
		isEnterpriseSelfHostedUser,
	]);

	return (
		<div className={cx('sidenav-container', isPinned && 'pinned')}>
			<div className={cx('sideNav', isPinned && 'pinned')}>
				<div className="brand-container">
					<div className="brand">
						<div className="brand-company-meta">
							<div
								className="brand-logo"
								// eslint-disable-next-line react/no-unknown-property
								onClick={(event: MouseEvent): void => {
									// Current home page
									onClickHandler(ROUTES.HOME, event);
								}}
							>
								<img src="/Logos/signoz-brand-logo.svg" alt="SigNoz" />
							</div>

							{licenseTag && (
								<Tooltip
									title={
										// eslint-disable-next-line no-nested-ternary
										isCommunityUser
											? 'You are running the community version of SigNoz. You have to install the Enterprise edition in order enable Enterprise features.'
											: isCommunityEnterpriseUser
											? 'You do not have an active license present. Add an active license to enable Enterprise features.'
											: ''
									}
									placement="bottomRight"
								>
									<div
										className={cx(
											'brand-title-section',
											isCommunityEnterpriseUser && 'community-enterprise-user',
										)}
									>
										<span className="license-type"> {licenseTag} </span>

										{currentVersion && (
											<Tooltip
												placement="bottomLeft"
												overlayClassName="version-tooltip-overlay"
												arrow={false}
												overlay={
													showVersionUpdateNotification && (
														<div className="version-update-notification-tooltip">
															<div className="version-update-notification-tooltip-title">
																There&apos;s a new version available.
															</div>

															<div className="version-update-notification-tooltip-content">
																{latestVersion}
															</div>
														</div>
													)
												}
											>
												<span className="version" onClick={onClickVersionHandler}>
													{currentVersion}
													{showVersionUpdateNotification && (
														<span className="version-update-notification-dot-icon" />
													)}
												</span>
											</Tooltip>
										)}
									</div>
								</Tooltip>
							)}
						</div>
					</div>
				</div>

				<div className={cx(`nav-wrapper`, isCloudUser && 'nav-wrapper-cloud')}>
					<div className="nav-top-section">
						{isCloudUser && user?.role !== USER_ROLES.VIEWER && (
							<div className="get-started-nav-items">
								<Button
									className="get-started-btn"
									disabled={isWorkspaceBlocked}
									onClick={(event: MouseEvent): void => {
										if (isWorkspaceBlocked) {
											return;
										}
										onClickGetStarted(event);
									}}
								>
									<PackagePlus size={16} />

									<div className="license tag nav-item-label"> New source </div>
								</Button>
							</div>
						)}

						<div className="primary-nav-items">
							{renderNavItems(primaryMenuItems)}
						</div>

						<div className="shortcut-nav-items">
							<div className="nav-title-section">
								<div className="nav-section-title">
									<div className="nav-section-title-icon">
										<MousePointerClick size={16} />
									</div>

									<div className="nav-section-title-text">SHORTCUTS</div>

									{pinnedMenuItems.length > 1 && (
										<div
											className="nav-section-title-icon reorder"
											onClick={(): void => {
												setIsReorderShortcutNavItemsModalOpen(true);
											}}
										>
											<Logs size={16} />
										</div>
									)}
								</div>

								{pinnedMenuItems.length === 0 && (
									<div className="nav-section-subtitle">
										You have not added any shortcuts yet.
									</div>
								)}

								{pinnedMenuItems.length > 0 && (
									<div className="nav-items-section">
										{renderNavItems(
											pinnedMenuItems.filter((item) => item.isEnabled),
											true,
										)}
									</div>
								)}
							</div>
						</div>

						{moreMenuItems.length > 0 && (
							<div
								className={cx(
									'more-nav-items',
									isMoreMenuCollapsed ? 'collapsed' : 'expanded',
								)}
							>
								<div className="nav-title-section">
									<div
										className="nav-section-title"
										onClick={(): void => {
											setIsMoreMenuCollapsed(!isMoreMenuCollapsed);
										}}
									>
										<div className="nav-section-title-icon">
											<Ellipsis size={16} />
										</div>

										<div className="nav-section-title-text">MORE</div>

										<div className="collapse-expand-section-icon">
											{isMoreMenuCollapsed ? (
												<ChevronDown size={16} />
											) : (
												<ChevronUp size={16} />
											)}
										</div>
									</div>
								</div>

								<div className="nav-items-section">
									{renderNavItems(
										moreMenuItems.filter((item) => item.isEnabled),
										true,
									)}
								</div>
							</div>
						)}
					</div>

					<div className="nav-bottom-section">
						<div className="secondary-nav-items">
							<div className="nav-dropdown-item">
								<Dropdown
									menu={{
										items: helpSupportDropdownMenuItems,
										onClick: handleHelpSupportMenuItemClick,
									}}
									placement="topLeft"
									overlayClassName="nav-dropdown-overlay help-support-dropdown"
									trigger={['click']}
								>
									<div className="nav-item">
										<div className="nav-item-data">
											<div className="nav-item-icon">{helpSupportMenuItem.icon}</div>

											<div className="nav-item-label">{helpSupportMenuItem.label}</div>
										</div>
									</div>
								</Dropdown>
							</div>

							<div className="nav-dropdown-item">
								<Dropdown
									menu={{
										items: userSettingsDropdownMenuItems,
										onClick: handleSettingsMenuItemClick,
									}}
									placement="topLeft"
									overlayClassName="nav-dropdown-overlay settings-dropdown"
									trigger={['click']}
								>
									<div className="nav-item">
										<div className="nav-item-data">
											<div className="nav-item-icon">{userSettingsMenuItem.icon}</div>

											<div className="nav-item-label">{userSettingsMenuItem.label}</div>
										</div>
									</div>
								</Dropdown>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Modal
				className="reorder-shortcut-nav-items-modal"
				title={<span className="title">Manage Shortcuts</span>}
				open={isReorderShortcutNavItemsModalOpen}
				closable
				onCancel={hideReorderShortcutNavItemsModal}
				footer={[
					<Button
						key="cancel"
						onClick={hideReorderShortcutNavItemsModal}
						className="periscope-btn cancel-btn secondary-btn"
						icon={<X size={16} />}
					>
						Cancel
					</Button>,
					<Button
						key="submit"
						type="primary"
						icon={<Check size={16} />}
						onClick={handleReorderShortcutNavItems}
						data-testid="save-view-btn"
					>
						Save Changes
					</Button>,
				]}
			>
				<div className="reorder-shortcut-nav-items-container">
					<div className="reorder-shortcut-nav-items">
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={tempPinnedMenuItems.map((f) => f.key)}
								strategy={verticalListSortingStrategy}
							>
								{tempPinnedMenuItems.map((item) => (
									<SortableFilter key={item.key} item={item} />
								))}
							</SortableContext>
						</DndContext>
					</div>
				</div>
			</Modal>
		</div>
	);
}

export default SideNav;
