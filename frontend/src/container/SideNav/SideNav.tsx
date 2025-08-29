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
import updateUserPreference from 'api/v1/user/preferences/name/update';
import cx from 'classnames';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import { GlobalShortcuts } from 'constants/shortcuts/globalShortcuts';
import { USER_PREFERENCES } from 'constants/userPreferences';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import useComponentPermission from 'hooks/useComponentPermission';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { isArray } from 'lodash-es';
import {
	ArrowUpRight,
	Check,
	ChevronDown,
	ChevronsDown,
	ChevronUp,
	Cog,
	Ellipsis,
	GitCommitVertical,
	GripVertical,
	LampDesk,
	Logs,
	MousePointerClick,
	PackagePlus,
	ScrollText,
	X,
} from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import {
	MouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { USER_ROLES } from 'types/roles';
import { checkVersionState } from 'utils/app';
import { showErrorNotification } from 'utils/error';

import { routeConfig } from './config';
import { getQueryString } from './helper';
import {
	defaultMoreMenuItems,
	helpSupportDropdownMenuItems as DefaultHelpSupportDropdownMenuItems,
	helpSupportMenuItem,
	primaryMenuItems,
} from './menuItems';
import NavItem from './NavItem/NavItem';
import {
	CHANGELOG_LABEL,
	DropdownSeparator,
	SidebarItem,
} from './sideNav.types';
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

	const {
		user,
		featureFlags,
		trialInfo,
		isLoggedIn,
		userPreferences,
		changelog,
		toggleChangelogModal,
		updateUserPreferenceInContext,
	} = useAppContext();

	const { notifications } = useNotifications();

	const { mutate: updateUserPreferenceMutation } = useMutation(
		updateUserPreference,
		{
			onError: (error: Error) => {
				showErrorNotification(notifications, error);
			},
		},
	);

	const [
		helpSupportDropdownMenuItems,
		setHelpSupportDropdownMenuItems,
	] = useState<(SidebarItem | DropdownSeparator)[]>(
		DefaultHelpSupportDropdownMenuItems,
	);

	const [pinnedMenuItems, setPinnedMenuItems] = useState<SidebarItem[]>([]);

	const [tempPinnedMenuItems, setTempPinnedMenuItems] = useState<SidebarItem[]>(
		[],
	);

	const [secondaryMenuItems, setSecondaryMenuItems] = useState<SidebarItem[]>(
		[],
	);

	const [hasScroll, setHasScroll] = useState(false);
	const navTopSectionRef = useRef<HTMLDivElement>(null);

	const checkScroll = useCallback((): void => {
		if (navTopSectionRef.current) {
			const { scrollHeight, clientHeight, scrollTop } = navTopSectionRef.current;
			const isAtBottom = scrollHeight - clientHeight - scrollTop <= 8;
			setHasScroll(scrollHeight > clientHeight + 24 && !isAtBottom); // 24px - buffer height to show show more
		}
	}, []);

	useEffect(() => {
		checkScroll();
		window.addEventListener('resize', checkScroll);

		// Create a MutationObserver to watch for content changes
		const observer = new MutationObserver(checkScroll);
		const navTopSection = navTopSectionRef.current;

		if (navTopSection) {
			observer.observe(navTopSection, {
				childList: true,
				subtree: true,
				attributes: true,
			});

			// Add scroll event listener
			navTopSection.addEventListener('scroll', checkScroll);
		}

		return (): void => {
			window.removeEventListener('resize', checkScroll);
			observer.disconnect();
			if (navTopSection) {
				navTopSection.removeEventListener('scroll', checkScroll);
			}
		};
	}, [checkScroll]);

	const {
		isCloudUser,
		isEnterpriseSelfHostedUser,
		isCommunityUser,
		isCommunityEnterpriseUser,
	} = useGetTenantLicense();

	const [licenseTag, setLicenseTag] = useState('');
	const isAdmin = user.role === USER_ROLES.ADMIN;
	const isEditor = user.role === USER_ROLES.EDITOR;

	useEffect(() => {
		const navShortcuts = (userPreferences?.find(
			(preference) => preference.name === USER_PREFERENCES.NAV_SHORTCUTS,
		)?.value as unknown) as string[];

		const shouldShowIntegrations =
			(isCloudUser || isEnterpriseSelfHostedUser) && (isAdmin || isEditor);

		if (navShortcuts && isArray(navShortcuts) && navShortcuts.length > 0) {
			// nav shortcuts is array of strings
			const pinnedItems = navShortcuts
				.map((shortcut) =>
					defaultMoreMenuItems.find((item) => item.itemKey === shortcut),
				)
				.filter((item): item is SidebarItem => item !== undefined);

			// Set pinned items in the order they were stored
			setPinnedMenuItems(pinnedItems);

			setSecondaryMenuItems(
				defaultMoreMenuItems.map((item) => ({
					...item,
					isPinned: pinnedItems.some((pinned) => pinned.itemKey === item.itemKey),
					isEnabled:
						item.key === ROUTES.INTEGRATIONS
							? shouldShowIntegrations
							: item.isEnabled,
				})),
			);
		} else {
			// Set default pinned items
			const defaultPinnedItems = defaultMoreMenuItems.filter(
				(item) => item.isPinned,
			);
			setPinnedMenuItems(defaultPinnedItems);

			setSecondaryMenuItems(
				defaultMoreMenuItems.map((item) => ({
					...item,
					isPinned: defaultPinnedItems.some(
						(pinned) => pinned.itemKey === item.itemKey,
					),
					isEnabled:
						item.key === ROUTES.INTEGRATIONS
							? shouldShowIntegrations
							: item.isEnabled,
				})),
			);
		}
	}, [
		userPreferences,
		isCloudUser,
		isEnterpriseSelfHostedUser,
		isAdmin,
		isEditor,
	]);

	const isOnboardingV3Enabled = featureFlags?.find(
		(flag) => flag.name === FeatureKeys.ONBOARDING_V3,
	)?.active;

	const isChatSupportEnabled = featureFlags?.find(
		(flag) => flag.name === FeatureKeys.CHAT_SUPPORT,
	)?.active;

	const isPremiumSupportEnabled = featureFlags?.find(
		(flag) => flag.name === FeatureKeys.PREMIUM_SUPPORT,
	)?.active;

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

	const updateNavShortcutsPreference = useCallback(
		(items: SidebarItem[]): void => {
			const navShortcuts = items
				.map((item) => item.itemKey)
				.filter(Boolean) as string[];

			updateUserPreferenceMutation(
				{
					name: USER_PREFERENCES.NAV_SHORTCUTS,
					value: navShortcuts,
				},
				{
					onSuccess: (response) => {
						if (response.data) {
							updateUserPreferenceInContext({
								name: USER_PREFERENCES.NAV_SHORTCUTS,
								description: USER_PREFERENCES.NAV_SHORTCUTS,
								valueType: 'array',
								defaultValue: false,
								allowedValues: [],
								allowedScopes: ['user'],
								value: navShortcuts,
							});
						}
					},
				},
			);
		},
		[updateUserPreferenceInContext, updateUserPreferenceMutation],
	);

	const onTogglePin = useCallback(
		(item: SidebarItem): void => {
			// Update secondary menu items first with new isPinned state
			setSecondaryMenuItems((prevItems) =>
				prevItems.map((i) => ({
					...i,
					isPinned: i.key === item.key ? !i.isPinned : i.isPinned,
				})),
			);

			// Update pinned menu items
			setPinnedMenuItems((prevItems) => {
				const isCurrentlyPinned = prevItems.some((i) => i.key === item.key);
				if (isCurrentlyPinned) {
					return prevItems.filter((i) => i.key !== item.key);
				}
				return [item, ...prevItems];
			});

			// Get the updated pinned menu items for preference update
			const updatedPinnedItems = pinnedMenuItems.some((i) => i.key === item.key)
				? pinnedMenuItems.filter((i) => i.key !== item.key)
				: [item, ...pinnedMenuItems];

			// Update user preference with the ordered list of item keys
			updateNavShortcutsPreference(updatedPinnedItems);
		},
		[pinnedMenuItems, updateNavShortcutsPreference],
	);

	const handleReorderShortcutNavItems = (): void => {
		logEvent('Sidebar V2: Save shortcuts clicked', {
			shortcuts: tempPinnedMenuItems.map((item) => item.key),
		});
		setPinnedMenuItems(tempPinnedMenuItems);

		// Update user preference with the new order
		updateNavShortcutsPreference(tempPinnedMenuItems);

		setIsReorderShortcutNavItemsModalOpen(false);
	};

	const sensors = useSensors(useSensor(PointerSensor));

	const hideReorderShortcutNavItemsModal = (): void => {
		setIsReorderShortcutNavItemsModalOpen(false);
	};

	useEffect(() => {
		if (isReorderShortcutNavItemsModalOpen) {
			setTempPinnedMenuItems(pinnedMenuItems);
		}
	}, [isReorderShortcutNavItemsModalOpen, pinnedMenuItems]);

	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

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
					dataTestId: 'logged-in-as-nav-item',
				},
				{ type: 'divider' as const },
				{
					key: 'account',
					label: 'Account Settings',
					dataTestId: 'account-settings-nav-item',
				},
				{
					key: 'workspace',
					label: 'Workspace Settings',
					disabled: isWorkspaceBlocked,
					dataTestId: 'workspace-settings-nav-item',
				},
				...(isEnterpriseSelfHostedUser || isCommunityEnterpriseUser
					? [
							{
								key: 'license',
								label: 'Manage License',
								dataTestId: 'manage-license-nav-item',
							},
					  ]
					: []),
				{ type: 'divider' as const },
				{
					key: 'logout',
					label: (
						<span className="user-settings-dropdown-logout-section">Sign out</span>
					),
					dataTestId: 'logout-nav-item',
				},
			].filter(Boolean),
		[
			isEnterpriseSelfHostedUser,
			isCommunityEnterpriseUser,
			user.email,
			isWorkspaceBlocked,
		],
	);

	useEffect(() => {
		if (isCloudUser) {
			setLicenseTag('Cloud');
		} else if (isEnterpriseSelfHostedUser) {
			setLicenseTag('Enterprise');
		} else if (isCommunityEnterpriseUser) {
			setLicenseTag('Free');
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
				prevState.filter(
					(item) => !('key' in item) || item.key !== 'invite-collaborators',
				),
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
				prevState.filter((item) => !('key' in item) || item.key !== 'chat-support'),
			);
		}

		if (changelog) {
			const firstTwoFeatures = changelog.features.slice(0, 2);
			const dropdownItems: SidebarItem[] = firstTwoFeatures.map(
				(feature, idx) => ({
					key: `changelog-${idx + 1}`,
					label: (
						<div className="nav-item-label-container">
							<span>{feature.title}</span>
						</div>
					),
					icon: idx === 0 ? <LampDesk size={14} /> : <GitCommitVertical size={14} />,
					itemKey: `changelog-${idx + 1}`,
				}),
			);
			const changelogKey = CHANGELOG_LABEL.toLowerCase().replace(' ', '-');
			setHelpSupportDropdownMenuItems((prevState) => {
				if (dropdownItems.length === 0) {
					return [
						...prevState,
						{
							type: 'divider',
						},
						{
							key: changelogKey,
							label: (
								<div className="nav-item-label-container">
									<span>{CHANGELOG_LABEL}</span>
									<ArrowUpRight size={14} />
								</div>
							),
							icon: <ScrollText size={14} />,
							itemKey: changelogKey,
							isExternal: true,
							url: 'https://signoz.io/changelog/',
						},
					];
				}

				return [
					...prevState,
					{
						type: 'divider',
					},
					{
						type: 'group',
						label: "WHAT's NEW",
					},
					...dropdownItems,
					{
						key: changelogKey,
						label: (
							<div className="nav-item-label-container">
								<span>{CHANGELOG_LABEL}</span>
								<ArrowUpRight size={14} />
							</div>
						),
						icon: <ScrollText size={14} />,
						itemKey: changelogKey,
						isExternal: true,
						url: 'https://signoz.io/changelog/',
					},
				];
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isAdmin,
		isChatSupportEnabled,
		isPremiumSupportEnabled,
		isCloudUser,
		trialInfo,
		changelog,
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
		logEvent('Sidebar V2: Menu clicked', {
			menuRoute: item?.key,
			menuLabel: item?.label,
		});
	};

	useEffect(() => {
		registerShortcut(GlobalShortcuts.NavigateToHome, () =>
			onClickHandler(ROUTES.HOME, null),
		);
		registerShortcut(GlobalShortcuts.NavigateToServices, () =>
			onClickHandler(ROUTES.APPLICATION, null),
		);
		registerShortcut(GlobalShortcuts.NavigateToTraces, () =>
			onClickHandler(ROUTES.TRACES_EXPLORER, null),
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
			deregisterShortcut(GlobalShortcuts.NavigateToHome);
			deregisterShortcut(GlobalShortcuts.NavigateToServices);
			deregisterShortcut(GlobalShortcuts.NavigateToTraces);
			deregisterShortcut(GlobalShortcuts.NavigateToLogs);
			deregisterShortcut(GlobalShortcuts.NavigateToDashboards);
			deregisterShortcut(GlobalShortcuts.NavigateToAlerts);
			deregisterShortcut(GlobalShortcuts.NavigateToExceptions);
			deregisterShortcut(GlobalShortcuts.NavigateToMessagingQueues);
		};
	}, [deregisterShortcut, onClickHandler, registerShortcut]);

	const isPinnedItem = useMemo(
		() => (item: SidebarItem): boolean =>
			secondaryMenuItems.some((i) => i.key === item.key && i.isPinned),
		[secondaryMenuItems],
	);

	const moreMenuItems = useMemo(
		() => secondaryMenuItems.filter((i) => !i.isPinned && i.isEnabled),
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
					onTogglePin={
						allowPin
							? (item): void => {
									logEvent(
										`Sidebar V2: Menu item ${item.isPinned ? 'unpinned' : 'pinned'}`,
										{
											menuRoute: item.key,
											menuLabel: item.label,
										},
									);
									onTogglePin(item);
							  }
							: undefined
					}
					onClick={(event): void => {
						handleMenuItemClick(event, item);
					}}
					isPinned={isPinnedItem(item)}
				/>
			))}
		</>
	);

	// Check scroll when menu items change
	useEffect(() => {
		checkScroll();
	}, [checkScroll, pinnedMenuItems, moreMenuItems]);

	const handleScrollForMore = (): void => {
		if (navTopSectionRef.current) {
			navTopSectionRef.current.scrollTo({
				top: navTopSectionRef.current.scrollHeight,
				behavior: 'smooth',
			});
		}
	};

	const handleHelpSupportMenuItemClick = (info: SidebarItem): void => {
		const item = helpSupportDropdownMenuItems.find(
			(item) => !('type' in item) && item.key === info.key,
		);

		if (item && !('type' in item) && item.isExternal && item.url) {
			window.open(item.url, '_blank');
		}

		if (item && !('type' in item)) {
			logEvent('Help Popover: Item clicked', {
				menuRoute: item.key,
				menuLabel: String(item.label),
			});

			switch (item.key) {
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
				case 'changelog-1':
				case 'changelog-2':
					toggleChangelogModal();
					break;
				default:
					break;
			}
		}
	};

	const handleSettingsMenuItemClick = (info: SidebarItem): void => {
		const item = userSettingsDropdownMenuItems.find(
			(item) => item?.key === info.key,
		);
		let menuLabel = '';
		if (
			item &&
			!('type' in item && item.type === 'divider') &&
			typeof item.label === 'string'
		) {
			menuLabel = item.label;
		}

		logEvent('Settings Popover: Item clicked', {
			menuRoute: item?.key,
			menuLabel,
		});
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

	const onClickVersionHandler = useCallback((): void => {
		if (!changelog) {
			return;
		}

		toggleChangelogModal();
	}, [changelog, toggleChangelogModal]);

	useEffect(() => {
		if (!isLatestVersion && !isCloudUser) {
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
								<div
									className={cx(
										'brand-title-section',
										isCommunityEnterpriseUser && 'community-enterprise-user',
										isCloudUser && 'cloud-user',
										showVersionUpdateNotification &&
											changelog &&
											'version-update-notification',
									)}
								>
									<span className="license-type"> {licenseTag} </span>

									{currentVersion && (
										<Tooltip
											placement="bottomLeft"
											overlayClassName="version-tooltip-overlay"
											arrow={false}
											overlay={
												showVersionUpdateNotification &&
												changelog && (
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
											<div className="version-container">
												<span
													className={cx('version', changelog && 'version-clickable')}
													onClick={onClickVersionHandler}
												>
													{currentVersion}
												</span>

												{showVersionUpdateNotification && changelog && (
													<span className="version-update-notification-dot-icon" />
												)}
											</div>
										</Tooltip>
									)}
								</div>
							)}
						</div>
					</div>
				</div>

				<div
					className={cx(
						`nav-wrapper`,
						isCloudUser && 'nav-wrapper-cloud',
						hasScroll && 'scroll-available',
					)}
				>
					<div className={cx('nav-top-section')} ref={navTopSectionRef}>
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
												logEvent('Sidebar V2: Manage shortcuts clicked', {});
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
											logEvent('Sidebar V2: More menu clicked', {
												action: isMoreMenuCollapsed ? 'expand' : 'collapse',
											});
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

						<div className="scroll-for-more-container">
							<div className="scroll-for-more" onClick={handleScrollForMore}>
								<div className="scroll-for-more-icon">
									<ChevronsDown size={16} />
								</div>

								<div className="scroll-for-more-label">Scroll for more</div>
							</div>
						</div>
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
										<div className="nav-item-data" data-testid="help-support-nav-item">
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
										<div className="nav-item-data" data-testid="settings-nav-item">
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
				onCancel={(): void => {
					logEvent('Sidebar V2: Manage shortcuts dismissed', {});
					hideReorderShortcutNavItemsModal();
				}}
				footer={[
					<Button
						key="cancel"
						onClick={(): void => {
							logEvent('Sidebar V2: Manage shortcuts dismissed', {});
							hideReorderShortcutNavItemsModal();
						}}
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
						data-testid="save-changes-btn"
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
