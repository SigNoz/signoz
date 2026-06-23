import { useCallback, useState } from 'react';
import { matchPath, useHistory, useLocation } from 'react-router-dom';
import ROUTES from 'constants/routes';
import useUrlQuery from 'hooks/useUrlQuery';

export type ViewMode = 'overview' | 'json';
export type TabKey = 'overview';

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

export function useViewRolePageCallbacks(): UseViewRolePageCallbacksResult {
	const { pathname } = useLocation();
	const history = useHistory();
	const urlQuery = useUrlQuery();

	const match = matchPath<{ roleId: string }>(pathname, {
		path: ROUTES.ROLE_DETAILS,
	});
	const roleId = match?.params?.roleId;
	const roleName = urlQuery.get('name') ?? '';

	const [activeTab, setActiveTab] = useState<TabKey>('overview');
	const [viewMode, setViewMode] = useState<ViewMode>('overview');
	const [expandedResources, setExpandedResources] = useState<Set<string>>(
		new Set(),
	);

	const handleRedirectToUpdate = useCallback(() => {
		if (!roleId || !roleName) {
			return;
		}

		const updateUrl = `${ROUTES.ROLE_EDIT.replace(':roleId', roleId)}?name=${roleName}`;
		history.push(updateUrl);
	}, [history, roleId, roleName]);

	const handleCancel = useCallback((): void => {
		history.push(ROUTES.ROLES_SETTINGS);
	}, [history]);

	const handleModeChange = useCallback((value: string): void => {
		setViewMode(value as ViewMode);
	}, []);

	const handleTabChange = useCallback((key: string): void => {
		setActiveTab(key as TabKey);
	}, []);

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
