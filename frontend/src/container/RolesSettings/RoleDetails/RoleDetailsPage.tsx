import { useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useHistory, useLocation } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { ChevronRight, Search, Table2, Trash2, Users } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/toggle-group';
import { Skeleton } from 'antd';
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
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { RoleType } from 'types/roles';
import { toAPIError } from 'utils/errorUtils';

import type { PermissionConfig } from '../PermissionSidePanel';
import PermissionSidePanel from '../PermissionSidePanel';
import CreateRoleModal from '../RolesComponents/CreateRoleModal';
import DeleteRoleModal from '../RolesComponents/DeleteRoleModal';
import {
	buildPatchPayload,
	derivePermissionTypes,
	deriveResourcesForRelation,
	handleApiError,
	objectsToPermissionConfig,
	TimestampBadge,
} from '../utils';
import { ROLE_ID_REGEX } from './constants';

import './RoleDetailsPage.styles.scss';

type TabKey = 'overview' | 'members';

interface PermissionType {
	key: string;
	label: string;
	icon: JSX.Element;
}

interface PermissionItemProps {
	permissionType: PermissionType;
	isManaged: boolean;
	onPermissionClick: (key: string) => void;
}

function PermissionItem({
	permissionType,
	isManaged,
	onPermissionClick,
}: PermissionItemProps): JSX.Element {
	const { key, label, icon } = permissionType;

	if (isManaged) {
		return (
			<div
				key={key}
				className="role-details-permission-item role-details-permission-item--readonly"
			>
				<div className="role-details-permission-item-left">
					{icon}
					<span className="role-details-permission-item-label">{label}</span>
				</div>
			</div>
		);
	}

	return (
		<div
			key={key}
			className="role-details-permission-item"
			role="button"
			tabIndex={0}
			onClick={(): void => onPermissionClick(key)}
			onKeyDown={(e): void => {
				if (e.key === 'Enter' || e.key === ' ') {
					onPermissionClick(key);
				}
			}}
		>
			<div className="role-details-permission-item-left">
				{icon}
				<span className="role-details-permission-item-label">{label}</span>
			</div>
			<ChevronRight size={14} color="var(--foreground)" />
		</div>
	);
}

interface OverviewTabProps {
	role: {
		description?: string;
		createdAt?: Date | string;
		updatedAt?: Date | string;
	} | null;
	isManaged: boolean;
	permissionTypes: PermissionType[];
	onPermissionClick: (relationKey: string) => void;
}

function OverviewTab({
	role,
	isManaged,
	permissionTypes,
	onPermissionClick,
}: OverviewTabProps): JSX.Element {
	return (
		<div className="role-details-overview">
			{isManaged && (
				<Callout
					type="warning"
					showIcon
					message="This is a managed role. Permissions and settings are view-only and cannot be modified."
				/>
			)}

			<div className="role-details-meta">
				<div>
					<p className="role-details-section-label">Description</p>
					<p className="role-details-description-text">{role?.description || '—'}</p>
				</div>

				<div className="role-details-info-row">
					<div className="role-details-info-col">
						<p className="role-details-section-label">Created At</p>
						<div className="role-details-info-value">
							<TimestampBadge date={role?.createdAt} />
						</div>
					</div>
					<div className="role-details-info-col">
						<p className="role-details-section-label">Last Modified At</p>
						<div className="role-details-info-value">
							<TimestampBadge date={role?.updatedAt} />
						</div>
					</div>
				</div>
			</div>

			<div className="role-details-permissions">
				<div className="role-details-permissions-header">
					<span className="role-details-section-label">Permissions</span>
					<hr className="role-details-permissions-divider" />
				</div>

				<div className="role-details-permission-list">
					{permissionTypes.map((permissionType) => (
						<PermissionItem
							key={permissionType.key}
							permissionType={permissionType}
							isManaged={isManaged}
							onPermissionClick={onPermissionClick}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function MembersTab(): JSX.Element {
	const [searchQuery, setSearchQuery] = useState('');

	return (
		<div className="role-details-members">
			<div className="role-details-members-search">
				<Search size={12} className="role-details-members-search-icon" />
				<input
					type="text"
					className="role-details-members-search-input"
					placeholder="Search and add members..."
					value={searchQuery}
					onChange={(e): void => setSearchQuery(e.target.value)}
				/>
			</div>

			{/* Todo: Right now we are only adding the empty state in this cut */}
			<div className="role-details-members-content">
				<div className="role-details-members-empty-state">
					<span
						className="role-details-members-empty-emoji"
						role="img"
						aria-label="monocle face"
					>
						🧐
					</span>
					<p className="role-details-members-empty-text">
						<span className="role-details-members-empty-text--bold">
							No members added.
						</span>{' '}
						<span className="role-details-members-empty-text--muted">
							Start adding members to this role.
						</span>
					</p>
				</div>
			</div>
		</div>
	);
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function RoleDetailsPage(): JSX.Element {
	const { pathname } = useLocation();
	const history = useHistory();
	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();
	const { authzResources } = useAppContext();

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

	if (isLoading || isTransitioning) {
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
				<h2 className="role-details-title">Role — {role?.name}</h2>
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
							color="secondary"
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
							name: role?.name || '',
							description: role?.description || '',
						}}
					/>
				</>
			)}

			<DeleteRoleModal
				isOpen={isDeleteModalOpen}
				roleName={role?.name || ''}
				isDeleting={isDeleting}
				onCancel={(): void => setIsDeleteModalOpen(false)}
				onConfirm={(): void => deleteRole({ pathParams: { id: roleId } })}
			/>
		</div>
	);
}

export default RoleDetailsPage;
