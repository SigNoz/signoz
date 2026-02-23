import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Button } from '@signozhq/button';
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
	Table2,
	Trash2,
	Users,
} from 'lucide-react';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useTimezone } from 'providers/Timezone';
import { ErrorV2Resp } from 'types/api';
import APIError from 'types/api/error';
import { toAPIError } from 'utils/errorUtils';

import CreateRoleModal from '../RolesComponents/CreateRoleModal';

import './RoleDetailsPage.styles.scss';

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

function OverviewTab({ role }: OverviewTabProps): JSX.Element {
	return (
		<div className="role-details-overview">
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
					{PERMISSION_TYPES.map(({ key, label, icon }) => (
						<div key={key} className="role-details-permission-item">
							<div className="role-details-permission-item-left">
								{icon}
								<span className="role-details-permission-item-label">{label}</span>
							</div>
							<ChevronRight size={14} color="var(--foreground)" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function MembersTab(): JSX.Element {
	return (
		<div className="role-details-members-empty">
			No members assigned to this role.
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

	const { data, isLoading, isError, error } = useGetRole({ id: roleId });
	const role = data?.data?.data;

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

	if (isLoading) {
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
			{/* Header */}
			<div className="role-details-header">
				<h2 className="role-details-title">Role — {role.name}</h2>
			</div>

			{/* Tab bar + Actions */}
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
			</div>

			{/* Content */}
			{activeTab === 'overview' && <OverviewTab role={role} />}
			{activeTab === 'members' && <MembersTab />}

			{/* Edit Role Modal */}
			<CreateRoleModal
				isOpen={isEditModalOpen}
				onClose={(): void => setIsEditModalOpen(false)}
				initialData={{
					id: roleId,
					name: role.name || '',
					description: role.description || '',
				}}
			/>
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
