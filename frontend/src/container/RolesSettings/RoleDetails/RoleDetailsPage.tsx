import { useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import { Trash2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import { Skeleton } from 'antd';
import {
	getGetObjectsQueryKey,
	useDeleteRole,
	useGetObjects,
	useGetRole,
	usePatchObjects,
} from 'api/generated/services/role';
import AuthZTooltip from 'components/AuthZTooltip/AuthZTooltip';
import PermissionDeniedFullPage from 'components/PermissionDeniedFullPage/PermissionDeniedFullPage';
import permissionsType from 'hooks/useAuthZ/permissions.type';
import {
	buildRoleDeletePermission,
	buildRoleReadPermission,
	buildRoleUpdatePermission,
} from 'hooks/useAuthZ/permissions/role.permissions';
import { useAuthZ } from 'hooks/useAuthZ/useAuthZ';

import type { AuthzResources } from '../utils';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import ROUTES from 'constants/routes';
import { capitalize } from 'lodash-es';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { RoleType } from 'types/roles';
import { handleApiError, toAPIError } from 'utils/errorUtils';

import type { PermissionConfig } from '../PermissionSidePanel';
import PermissionSidePanel from '../PermissionSidePanel';
import CreateRoleModal from '../RolesComponents/CreateRoleModal';
import DeleteRoleModal from '../RolesComponents/DeleteRoleModal';
import {
	buildPatchPayload,
	derivePermissionTypes,
	deriveResourcesForRelation,
	objectsToPermissionConfig,
} from '../utils';
import OverviewTab from './components/OverviewTab';
import { ROLE_ID_REGEX } from './constants';

import './RoleDetailsPage.styles.scss';

// eslint-disable-next-line sonarjs/cognitive-complexity
function RoleDetailsPage(): JSX.Element {
	const { pathname, search } = useLocation();
	const history = useHistory();

	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();

	const authzResources = permissionsType.data as unknown as AuthzResources;

	// Extract roleId from URL pathname since useParams doesn't work in nested routing
	const roleIdMatch = pathname.match(ROLE_ID_REGEX);
	const roleId = roleIdMatch ? roleIdMatch[1] : '';

	// Role name passed as query param by the listing page — used to check read permission
	// before the role details API resolves. Absent when navigating directly (e.g. deep link),
	// in which case we skip the FGA check and fall back to the BE guard.
	const nameFromQuery = useMemo(
		() => new URLSearchParams(search).get('name') ?? '',
		[search],
	);

	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [activePermission, setActivePermission] = useState<string | null>(null);

	const { data, isLoading, isFetching, isError, error } = useGetRole(
		{ id: roleId },
		{ query: { enabled: !!roleId } },
	);
	const role = data?.data;
	const isTransitioning = isFetching && role?.id !== roleId;
	const isManaged = role?.type === RoleType.MANAGED;

	const roleName = role?.name ?? '';

	// Read check — fires immediately using the name query param so we can gate the page
	// before the role details API resolves. Skipped when name is absent.
	const { permissions: readPerms, isLoading: isReadAuthZLoading } = useAuthZ(
		nameFromQuery ? [buildRoleReadPermission(nameFromQuery)] : [],
		{ enabled: !!nameFromQuery },
	);
	const hasReadPermission = nameFromQuery
		? (readPerms?.[buildRoleReadPermission(nameFromQuery)]?.isGranted ?? true)
		: true;

	// Update check uses role name once loaded
	const { permissions: updatePerms, isLoading: isAuthZLoading } = useAuthZ(
		roleName && !isManaged ? [buildRoleUpdatePermission(roleName)] : [],
		{ enabled: !!roleName && !isManaged },
	);
	const hasUpdatePermission = isAuthZLoading
		? false
		: (updatePerms?.[buildRoleUpdatePermission(roleName)]?.isGranted ?? false);

	const permissionTypes = useMemo(
		() => derivePermissionTypes(authzResources?.relations ?? null),
		[authzResources],
	);

	const resourcesForActivePermission = useMemo(
		() =>
			activePermission
				? deriveResourcesForRelation(authzResources ?? null, activePermission)
				: [],
		[authzResources, activePermission],
	);

	const { data: objectsData, isLoading: isLoadingObjects } = useGetObjects(
		{ id: roleId, relation: activePermission ?? '' },
		{
			query: {
				enabled: !!activePermission && !!roleId && !isManaged,
			},
		},
	);

	const initialConfig = useMemo(() => {
		if (!objectsData?.data || !activePermission) {
			return;
		}
		return objectsToPermissionConfig(
			objectsData.data,
			resourcesForActivePermission,
		);
	}, [objectsData, activePermission, resourcesForActivePermission]);

	const handleSaveSuccess = (): void => {
		toast.success('Permissions saved successfully');
		if (activePermission) {
			queryClient.removeQueries(
				getGetObjectsQueryKey({ id: roleId, relation: activePermission }),
			);
		}
	};

	const { mutate: patchObjects, isLoading: isSaving } = usePatchObjects({
		mutation: {
			onSuccess: handleSaveSuccess,
			onError: (err) => handleApiError(err, showErrorModal),
		},
	});

	const { mutate: deleteRole, isLoading: isDeleting } = useDeleteRole({
		mutation: {
			onSuccess: (): void => {
				toast.success('Role deleted successfully');
				history.push(ROUTES.ROLES_SETTINGS);
			},
			onError: (err) => handleApiError(err, showErrorModal),
		},
	});

	if (!hasReadPermission && readPerms !== null) {
		return <PermissionDeniedFullPage permissionName="role:read" />;
	}

	if (isLoading || isTransitioning || (!!nameFromQuery && isReadAuthZLoading)) {
		return (
			<div className="role-details-page">
				<Skeleton
					active
					paragraph={{ rows: 8 }}
					className="role-details-skeleton"
				/>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="role-details-page">
				<ErrorInPlace
					error={toAPIError(
						error,
						'An unexpected error occurred while fetching role details.',
					)}
				/>
			</div>
		);
	}

	if (!role) {
		return (
			<div className="role-details-page">
				<Skeleton
					active
					paragraph={{ rows: 8 }}
					className="role-details-skeleton"
				/>
			</div>
		);
	}

	const handleSave = (config: PermissionConfig): void => {
		if (!activePermission || !authzResources) {
			return;
		}
		patchObjects({
			pathParams: { id: roleId, relation: activePermission },
			data: buildPatchPayload({
				newConfig: config,
				initialConfig: initialConfig ?? {},
				resources: resourcesForActivePermission,
				authzRes: authzResources,
			}),
		});
	};

	return (
		<div className="role-details-page">
			<div className="role-details-header">
				<h2 className="role-details-title">Role — {role.name}</h2>
				{!isManaged && (
					<div className="role-details-actions">
						<AuthZTooltip checks={[buildRoleDeletePermission(role.name)]}>
							<Button
								variant="link"
								color="destructive"
								onClick={(): void => setIsDeleteModalOpen(true)}
								aria-label="Delete role"
							>
								<Trash2 size={12} />
							</Button>
						</AuthZTooltip>
						<AuthZTooltip checks={[buildRoleUpdatePermission(role.name)]}>
							<Button
								variant="solid"
								color="secondary"
								onClick={(): void => setIsEditModalOpen(true)}
							>
								Edit Role Details
							</Button>
						</AuthZTooltip>
					</div>
				)}
			</div>

			<OverviewTab
				role={role || null}
				isManaged={isManaged}
				permissionTypes={permissionTypes}
				onPermissionClick={(key): void => setActivePermission(key)}
			/>
			{!isManaged && (
				<>
					<PermissionSidePanel
						open={activePermission !== null}
						onClose={(): void => setActivePermission(null)}
						permissionLabel={activePermission ? capitalize(activePermission) : ''}
						relation={activePermission ?? ''}
						resources={resourcesForActivePermission}
						initialConfig={initialConfig}
						isLoading={isLoadingObjects}
						isSaving={isSaving}
						canEdit={hasUpdatePermission}
						onSave={handleSave}
					/>

					<CreateRoleModal
						isOpen={isEditModalOpen}
						onClose={(): void => setIsEditModalOpen(false)}
						initialData={{
							id: roleId,
							name: role.name || '',
							description: role.description || '',
						}}
					/>
				</>
			)}

			<DeleteRoleModal
				isOpen={isDeleteModalOpen}
				roleName={role.name || ''}
				isDeleting={isDeleting}
				onCancel={(): void => setIsDeleteModalOpen(false)}
				onConfirm={(): void => deleteRole({ pathParams: { id: roleId } })}
			/>
		</div>
	);
}

export default RoleDetailsPage;
