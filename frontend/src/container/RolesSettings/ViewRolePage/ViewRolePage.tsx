import { useMemo } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Divider } from '@signozhq/ui/divider';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Tabs } from '@signozhq/ui/tabs';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { Skeleton } from 'antd';
import { useGetRole } from 'api/generated/services/role';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import PermissionDeniedFullPage from 'components/PermissionDeniedFullPage/PermissionDeniedFullPage';
import { useDeleteRoleModal } from 'container/RolesSettings/DeleteRoleModal/useDeleteRoleModal';
import { useRoleAuthZ } from 'container/RolesSettings/hooks/useRoleAuthZ';
import { transformApiToRolePermissions } from 'container/RolesSettings/hooks/useRolePermissions';
import { useTimezone } from 'providers/Timezone';
import { RoleType } from 'types/roles';
import { toAPIError } from 'utils/errorUtils';

import DeleteRoleModal from '../DeleteRoleModal/DeleteRoleModal';
import PermissionOverview from './components/PermissionOverview';
import ReadOnlyJsonViewer from './ReadOnlyJsonViewer';
import { useViewRolePageCallbacks } from './useViewRolePageCallbacks';

import styles from './ViewRolePage.module.scss';

function ViewRolePage(): JSX.Element {
	const { formatTimezoneAdjustedTimestampOptional } = useTimezone();

	const {
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
	} = useViewRolePageCallbacks();

	const {
		hasReadPermission,
		readRolePermission,
		hasUpdatePermission,
		updateRolePermission,
		hasDeletePermission,
		isAuthZLoading,
	} = useRoleAuthZ(roleName);

	const { data, isLoading, error } = useGetRole(
		{ id: roleId ?? '' },
		{ query: { enabled: !!roleId && hasReadPermission } },
	);
	const role = data?.data;
	const isManaged = role?.type === RoleType.MANAGED;

	const {
		isDeleteModalOpen,
		isDeleteDisabled,
		deleteDisabledReason,
		deleteErrorMessage,
		handleOpenDeleteModal,
		handleCloseDeleteModal,
		handleConfirmDelete,
	} = useDeleteRoleModal({
		roleId,
		isManaged: isManaged ?? false,
		hasDeletePermission,
		onDeleteSuccess: handleCancel,
	});

	const tabItems = useMemo(
		() => [
			{
				key: 'overview' as const,
				label: 'Overview',
				children: (
					<div className={styles.permissionSection}>
						<div className={styles.permissionHeader}>
							<span className={styles.permissionTitle}>Transaction Groups</span>
							<hr className={styles.permissionDivider} />
							<RadioGroup
								className={styles.permissionModeToggle}
								value={viewMode}
								onChange={handleModeChange}
								testId="permission-view-mode"
							>
								<RadioGroupItem
									value="overview"
									containerClassName={styles.permissionModeItem}
									className={styles.permissionModeInput}
									testId="permission-view-mode-overview"
								>
									Overview
								</RadioGroupItem>
								<RadioGroupItem
									value="json"
									containerClassName={styles.permissionModeItem}
									className={styles.permissionModeInput}
									testId="permission-view-mode-json"
								>
									JSON
								</RadioGroupItem>
							</RadioGroup>
						</div>

						<div className={styles.permissionContent}>
							{viewMode === 'overview' ? (
								<PermissionOverview
									roleId={roleId ?? ''}
									expandedResources={expandedResources}
									onExpandedResourcesChange={setExpandedResources}
								/>
							) : role ? (
								<ReadOnlyJsonViewer permissions={transformApiToRolePermissions(role)} />
							) : null}
						</div>
					</div>
				),
			},
		],
		[
			viewMode,
			handleModeChange,
			roleId,
			role,
			expandedResources,
			setExpandedResources,
		],
	);

	if (!hasReadPermission && !isAuthZLoading) {
		return (
			<PermissionDeniedFullPage permissionName={readRolePermission.object} />
		);
	}

	if (isAuthZLoading || isLoading) {
		return (
			<div className={styles.viewRolePage}>
				<Skeleton active paragraph={{ rows: 8 }} />
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.viewRolePage} data-testid="view-role-page">
				<div className={styles.viewRolePageHeader}>
					<Typography.Title level={3}>Failed to load role</Typography.Title>

					<div className={styles.viewRolePageActions}>
						<Button
							variant="solid"
							color="secondary"
							onClick={handleCancel}
							data-testid="cancel-button"
						>
							Back to roles
						</Button>
					</div>
				</div>

				<ErrorInPlace
					error={toAPIError(error, 'Failed to load role details')}
					data-testid="role-error-banner"
				/>
			</div>
		);
	}

	if (!role) {
		return <></>;
	}

	return (
		<div className={styles.viewRolePage} data-testid="view-role-page">
			<div className={styles.viewRolePageHeader}>
				<Typography.Title level={3}>
					{'Role - ' + role.name || 'Loading role...'}
				</Typography.Title>

				<div className={styles.viewRolePageActions}>
					<TooltipSimple
						title={isDeleteDisabled ? deleteDisabledReason : 'Open delete modal'}
					>
						<Button
							variant="link"
							color="destructive"
							onClick={handleOpenDeleteModal}
							disabled={isDeleteDisabled}
							data-testid="delete-button"
							className={styles.deleteButton}
						>
							Delete
						</Button>
					</TooltipSimple>

					<Divider type="vertical" />

					<Button
						variant="solid"
						color="secondary"
						onClick={handleCancel}
						data-testid="cancel-button"
					>
						Back to List
					</Button>

					<TooltipSimple
						title={
							isManaged
								? 'Managed roles cannot be updated'
								: hasUpdatePermission
									? 'Open update page'
									: `You are not authorized to perform ${updateRolePermission.object}`
						}
					>
						<Button
							variant="solid"
							color="primary"
							data-testid="save-button"
							disabled={isManaged || !hasUpdatePermission}
							onClick={handleRedirectToUpdate}
							style={
								isManaged || !hasUpdatePermission
									? { pointerEvents: 'auto' }
									: undefined
							}
						>
							Update
						</Button>
					</TooltipSimple>
				</div>
			</div>

			<div className={styles.viewRolePageContent}>
				<div className={styles.viewRolePageForm}>
					<div className={styles.formField}>
						<label htmlFor="role-description" className={styles.formLabel}>
							Description
						</label>
						<Typography>{role.description}</Typography>
					</div>
					<div className={styles.formRow}>
						<div className={styles.formField}>
							<label htmlFor="role-created-at" className={styles.formLabel}>
								Created At
							</label>
							<Badge color="secondary">
								{formatTimezoneAdjustedTimestampOptional(role.createdAt)}
							</Badge>
						</div>
						<div className={styles.formField}>
							<label htmlFor="role-modified-at" className={styles.formLabel}>
								Last Modified At
							</label>
							<Badge color="secondary">
								{formatTimezoneAdjustedTimestampOptional(role.updatedAt)}
							</Badge>
						</div>
					</div>
				</div>

				<Divider />

				<Tabs
					className={styles.roleTabs}
					value={activeTab}
					onChange={handleTabChange}
					items={tabItems}
				/>
			</div>
			<DeleteRoleModal
				isOpen={isDeleteModalOpen}
				roleName={role.name}
				errorMessage={deleteErrorMessage}
				onCancel={handleCloseDeleteModal}
				onConfirm={handleConfirmDelete}
			/>
		</div>
	);
}

export default ViewRolePage;
