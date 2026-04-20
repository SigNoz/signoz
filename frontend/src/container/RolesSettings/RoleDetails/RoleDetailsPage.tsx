import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { Table2, Trash2, Users } from '@signozhq/icons';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { toast } from '@signozhq/ui';
import { Skeleton } from 'antd';
import { useAuthzResources } from 'api/generated/services/authz';
import {
	getGetObjectsQueryKey,
	useDeleteRole,
	useGetObjects,
	useGetRole,
	usePatchObjects,
} from 'api/generated/services/role';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import ROUTES from 'constants/routes';
import { capitalize } from 'lodash-es';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { RoleType } from 'types/roles';
import { handleApiError, toAPIError } from 'utils/errorUtils';

import { IS_ROLE_DETAILS_AND_CRUD_ENABLED } from '../config';
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
import MembersTab from './components/MembersTab';
import OverviewTab from './components/OverviewTab';
import { ROLE_ID_REGEX } from './constants';

import './RoleDetailsPage.styles.scss';

type TabKey = 'overview' | 'members';

// eslint-disable-next-line sonarjs/cognitive-complexity
function RoleDetailsPage(): JSX.Element {
	const { pathname } = useLocation();
	const history = useHistory();

	useEffect(() => {
		if (!IS_ROLE_DETAILS_AND_CRUD_ENABLED) {
			history.push(ROUTES.ROLES_SETTINGS);
		}
	}, [history]);

	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();

	const { data: authzResourcesResponse } = useAuthzResources({
		query: { enabled: true },
	});
	const authzResources = authzResourcesResponse?.data ?? null;

	// Extract channelId from URL pathname since useParams doesn't work in nested routing
	const roleIdMatch = pathname.match(ROLE_ID_REGEX);
	const roleId = roleIdMatch ? roleIdMatch[1] : '';

	const [activeTab, setActiveTab] = useState<TabKey>('overview');
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
		{ query: { enabled: !!activePermission && !!roleId && !isManaged } },
	);

	const initialConfig = useMemo(() => {
		if (!objectsData?.data || !activePermission) {
			return undefined;
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
		setActivePermission(null);
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

	if (!IS_ROLE_DETAILS_AND_CRUD_ENABLED || isLoading || isTransitioning) {
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
			</div>

			<div className="role-details-nav">
				<ToggleGroup
					type="single"
					value={activeTab}
					onValueChange={(val): void => {
						if (val) {
							setActiveTab(val as TabKey);
						}
					}}
					className="role-details-tabs"
				>
					<ToggleGroupItem value="overview" className="role-details-tab">
						<Table2 size={14} />
						Overview
					</ToggleGroupItem>
					<ToggleGroupItem value="members" className="role-details-tab">
						<Users size={14} />
						Members
						<span className="role-details-tab-count">0</span>
					</ToggleGroupItem>
				</ToggleGroup>

				{!isManaged && (
					<div className="role-details-actions">
						<Button
							variant="ghost"
							color="destructive"
							className="role-details-delete-action-btn"
							onClick={(): void => setIsDeleteModalOpen(true)}
							aria-label="Delete role"
						>
							<Trash2 size={14} />
						</Button>
						<Button
							variant="solid"
							color="secondary"
							size="sm"
							onClick={(): void => setIsEditModalOpen(true)}
						>
							Edit Role Details
						</Button>
					</div>
				)}
			</div>

			{activeTab === 'overview' && (
				<OverviewTab
					role={role || null}
					isManaged={isManaged}
					permissionTypes={permissionTypes}
					onPermissionClick={(key): void => setActivePermission(key)}
				/>
			)}
			{activeTab === 'members' && <MembersTab />}

			{!isManaged && (
				<>
					<PermissionSidePanel
						open={activePermission !== null}
						onClose={(): void => setActivePermission(null)}
						permissionLabel={activePermission ? capitalize(activePermission) : ''}
						resources={resourcesForActivePermission}
						initialConfig={initialConfig}
						isLoading={isLoadingObjects}
						isSaving={isSaving}
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
