/* eslint-disable sonarjs/cognitive-complexity */
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { X } from '@signozhq/icons';
import { toast } from '@signozhq/sonner';
import { Modal, Skeleton } from 'antd';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { useDeleteRole, useGetRole } from 'api/generated/services/role';
import { RoletypesRoleDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import {
	BadgePlus,
	ChevronRight,
	Eye,
	LayoutList,
	PencilRuler,
	Search,
	Table2,
	Trash2,
	Users,
} from 'lucide-react';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useTimezone } from 'providers/Timezone';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';
import { toAPIError } from 'utils/errorUtils';

import type {
	PermissionConfig,
	ResourceDefinition,
} from '../PermissionSidePanel';
import PermissionSidePanel from '../PermissionSidePanel';
import CreateRoleModal from '../RolesComponents/CreateRoleModal';

import './RoleDetailsPage.styles.scss';

// Placeholder resources — replace with API-driven data when integrating
const PERMISSION_RESOURCES: ResourceDefinition[] = [
	{ id: 'dashboards', label: 'Dashboards' },
	{ id: 'alerts', label: 'Alerts' },
	{ id: 'logs_pipelines', label: 'Logs: Pipelines' },
	{ id: 'logs_views', label: 'Logs: Views' },
	{ id: 'traces_funnels', label: 'Traces: Funnels' },
	{ id: 'traces_views', label: 'Traces: Views' },
	{ id: 'integrations', label: 'Integrations' },
	{ id: 'exceptions', label: 'Exceptions' },
];

type TabKey = 'overview' | 'members';

interface PermissionType {
	key: string;
	label: string;
	icon: JSX.Element;
}

const PERMISSION_TYPES: PermissionType[] = [
	{ key: 'create', label: 'Create', icon: <BadgePlus size={14} /> },
	{ key: 'list', label: 'List', icon: <LayoutList size={14} /> },
	{ key: 'read', label: 'Read', icon: <Eye size={14} /> },
	{ key: 'update', label: 'Update', icon: <PencilRuler size={14} /> },
	{ key: 'delete', label: 'Delete', icon: <Trash2 size={14} /> },
];

interface OverviewTabProps {
	role: RoletypesRoleDTO;
	isManaged: boolean;
	onPermissionClick: (permissionLabel: string) => void;
}

function TimestampBadge({ date }: { date?: Date | string }): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	if (!date) {
		return <span className="role-details-badge">—</span>;
	}

	const d = new Date(date);
	if (Number.isNaN(d.getTime())) {
		return <span className="role-details-badge">—</span>;
	}

	const formatted = formatTimezoneAdjustedTimestamp(
		date,
		DATE_TIME_FORMATS.DASH_DATETIME,
	);

	return <span className="role-details-badge">{formatted}</span>;
}

function OverviewTab({
	role,
	isManaged,
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
					<p className="role-details-description-text">{role.description || '—'}</p>
				</div>

				<div className="role-details-info-row">
					<div className="role-details-info-col">
						<p className="role-details-section-label">Created At</p>
						<div className="role-details-info-value">
							<TimestampBadge date={role.createdAt} />
						</div>
					</div>
					<div className="role-details-info-col">
						<p className="role-details-section-label">Last Modified At</p>
						<div className="role-details-info-value">
							<TimestampBadge date={role.updatedAt} />
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
					{PERMISSION_TYPES.map(({ key, label, icon }) =>
						isManaged ? (
							<div
								key={key}
								className="role-details-permission-item role-details-permission-item--readonly"
							>
								<div className="role-details-permission-item-left">
									{icon}
									<span className="role-details-permission-item-label">{label}</span>
								</div>
							</div>
						) : (
							<div
								key={key}
								className="role-details-permission-item"
								role="button"
								tabIndex={0}
								onClick={(): void => onPermissionClick(label)}
								onKeyDown={(e): void => {
									if (e.key === 'Enter' || e.key === ' ') {
										onPermissionClick(label);
									}
								}}
							>
								<div className="role-details-permission-item-left">
									{icon}
									<span className="role-details-permission-item-label">{label}</span>
								</div>
								<ChevronRight size={14} color="var(--foreground)" />
							</div>
						),
					)}
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

function RoleDetailsPage(): JSX.Element {
	const { pathname } = useLocation();
	const history = useHistory();
	const { showErrorModal } = useErrorModal();

	// Extract roleId from pathname — useParams doesn't work inside nested RouteTab (antd Tabs) routing
	const roleIdMatch = pathname.match(/\/settings\/roles\/([^/]+)/);
	const roleId = roleIdMatch ? roleIdMatch[1] : '';

	const [activeTab, setActiveTab] = useState<TabKey>('overview');
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [activePermission, setActivePermission] = useState<string | null>(null);
	const [permissionConfigs, setPermissionConfigs] = useState<
		Record<string, PermissionConfig>
	>({});

	const { data, isLoading, isFetching, isError, error } = useGetRole({
		id: roleId,
	});
	const role = data?.data?.data;
	const isTransitioning = isFetching && role?.id !== roleId;
	const isManaged = role?.type === 'managed';

	const { mutate: deleteRole, isLoading: isDeleting } = useDeleteRole({
		mutation: {
			onSuccess: (): void => {
				toast.success('Role deleted successfully');
				history.push(ROUTES.ROLES_SETTINGS);
			},
			onError: (err): void => {
				try {
					ErrorResponseHandlerV2(err as AxiosError<ErrorV2Resp>);
				} catch (apiError) {
					showErrorModal(apiError as APIError);
				}
			},
		},
	});

	const openEditModal = (): void => {
		setIsEditModalOpen(true);
	};

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

	if (isError || !role) {
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

	return (
		<div className="role-details-page">
			<div className="role-details-header">
				<h2 className="role-details-title">Role — {role.name}</h2>
			</div>

			<div className="role-details-nav">
				<div className="role-details-tabs">
					<button
						type="button"
						className={`role-details-tab${
							activeTab === 'overview' ? ' role-details-tab--active' : ''
						}`}
						onClick={(): void => setActiveTab('overview')}
					>
						<Table2 size={14} />
						Overview
					</button>
					<button
						type="button"
						className={`role-details-tab${
							activeTab === 'members' ? ' role-details-tab--active' : ''
						}`}
						onClick={(): void => setActiveTab('members')}
					>
						<Users size={14} />
						Members
						<span className="role-details-tab-count">0</span>
					</button>
				</div>

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
							onClick={openEditModal}
						>
							Edit Role Details
						</Button>
					</div>
				)}
			</div>

			{/* Content */}
			{activeTab === 'overview' && (
				<OverviewTab
					role={role}
					isManaged={isManaged}
					onPermissionClick={(label): void => setActivePermission(label)}
				/>
			)}
			{activeTab === 'members' && <MembersTab />}

			{!isManaged && (
				<>
					<PermissionSidePanel
						open={activePermission !== null}
						onClose={(): void => setActivePermission(null)}
						permissionLabel={activePermission ?? ''}
						resources={PERMISSION_RESOURCES}
						initialConfig={
							activePermission ? permissionConfigs[activePermission] : undefined
						}
						onSave={(config): void => {
							if (activePermission) {
								setPermissionConfigs((prev) => ({
									...prev,
									[activePermission]: config,
								}));
							}
						}}
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

			{/* Delete Role Confirmation Modal */}
			<Modal
				open={isDeleteModalOpen}
				onCancel={(): void => setIsDeleteModalOpen(false)}
				title={<span className="title">Delete Role</span>}
				closable
				footer={[
					<Button
						key="cancel"
						className="cancel-btn"
						prefixIcon={<X size={16} />}
						onClick={(): void => setIsDeleteModalOpen(false)}
						size="sm"
					>
						Cancel
					</Button>,
					<Button
						key="delete"
						className="delete-btn"
						prefixIcon={<Trash2 size={16} />}
						onClick={(): void => deleteRole({ pathParams: { id: roleId } })}
						loading={isDeleting}
						size="sm"
					>
						Delete Role
					</Button>,
				]}
				destroyOnClose
				className="role-details-delete-modal"
			>
				<p className="delete-text">
					Are you sure you want to delete the role <strong>{role.name}</strong>? This
					action cannot be undone.
				</p>
			</Modal>
		</div>
	);
}

export default RoleDetailsPage;
