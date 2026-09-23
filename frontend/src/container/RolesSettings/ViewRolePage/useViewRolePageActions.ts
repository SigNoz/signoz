import { useCallback, useState } from 'react';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useAppLocation } from 'lib/router/useAppLocation';
import { matchRoute } from 'lib/router/matchRoute';
import useUrlQuery from 'hooks/useUrlQuery';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

export type ViewMode = 'list' | 'json';
export type TabKey = 'overview';

const VIEW_MODES: ViewMode[] = ['list', 'json'];
const TAB_KEYS: TabKey[] = ['overview'];

interface UseViewRolePageCallbacksResult {
	roleId: string | undefined;
	roleName: string;
	activeTab: TabKey;
	viewMode: ViewMode;
	expandedResources: Set<string>;
	setExpandedResources: (resources: Set<string>) => void;
	handleRedirectToUpdate: () => void;
	handleCancel: () => void;
	handleModeChange: (value: string) => void;
	handleTabChange: (key: string) => void;
}

export function useViewRolePageActions(): UseViewRolePageCallbacksResult {
	const { pathname } = useAppLocation();
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	const match = matchRoute<'roleId'>(pathname, ROUTES.ROLE_DETAILS);
	const roleId = match?.params?.roleId;
	const roleName = urlQuery.get('name') ?? '';

	const [activeTab, setActiveTab] = useQueryState(
		'tab',
		parseAsStringLiteral(TAB_KEYS).withDefault('overview'),
	);
	const [viewMode, setViewMode] = useQueryState(
		'viewMode',
		parseAsStringLiteral(VIEW_MODES).withDefault('list'),
	);
	const [expandedResources, setExpandedResources] = useState<Set<string>>(
		new Set(),
	);

	const handleRedirectToUpdate = useCallback(() => {
		if (!roleId || !roleName) {
			return;
		}

		const updateUrl = `${ROUTES.ROLE_EDIT.replace(':roleId', roleId)}?name=${roleName}`;
		safeNavigate(updateUrl);
	}, [safeNavigate, roleId, roleName]);

	const handleCancel = useCallback((): void => {
		safeNavigate(ROUTES.ROLES_SETTINGS);
	}, [safeNavigate]);

	const handleModeChange = useCallback(
		(value: string): void => {
			void setViewMode(value as ViewMode);
		},
		[setViewMode],
	);

	const handleTabChange = useCallback(
		(key: string): void => {
			void setActiveTab(key as TabKey);
		},
		[setActiveTab],
	);

	return {
		roleId,
		roleName,
		activeTab,
		viewMode,
		expandedResources,
		setExpandedResources,
		handleRedirectToUpdate,
		handleCancel,
		handleModeChange,
		handleTabChange,
	};
}
