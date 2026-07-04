import { useMemo } from 'react';
import { ArrowLeft } from '@signozhq/icons';
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
import PermissionDeniedFullPage from 'lib/authz/components/PermissionDeniedFullPage/PermissionDeniedFullPage';
import { useDeleteRoleModal } from 'container/RolesSettings/DeleteRoleModal/useDeleteRoleModal';
import { useRoleAuthZ } from 'container/RolesSettings/hooks/useRoleAuthZ';
import { transformApiToRolePermissions } from 'container/RolesSettings/hooks/useRolePermissions';
import { useRolesFeatureGate } from 'hooks/useRolesFeatureGate';
import { useTimezone } from 'providers/Timezone';
import APIError from 'types/api/error';
import { RoleType } from 'types/roles';
import { toAPIError } from 'utils/errorUtils';

import DeleteRoleModal from '../DeleteRoleModal/DeleteRoleModal';
import PermissionOverview from './components/PermissionOverview';
import ReadOnlyJsonViewer from './ReadOnlyJsonViewer';
import { useViewRolePageActions } from './useViewRolePageActions';

import styles from './ViewRolePage.module.scss';

function ViewRolePage(): JSX.Element {
	const { formatTimezoneAdjustedTimestampOptional } = useTimezone();
	const { isRolesEnabled, isLoading: isFeatureGateLoading } =
		useRolesFeatureGate();

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
	} = useViewRolePageActions();

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
		deleteError,
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
							<Typography
								as="span"
								size="small"
								weight="medium"
								color="muted"
								className={styles.permissionTitle}
							>
								Transaction Groups
							</Typography>
							<hr className={styles.permissionDivider} />
							<RadioGroup
								className={styles.permissionModeToggle}
								value={viewMode}
								onChange={handleModeChange}
								testId="permission-view-mode"
							>
								<RadioGroupItem
									value="list"
									containerClassName={styles.permissionModeItem}
									className={styles.permissionModeInput}
									testId="permission-view-mode-list"
								>
									List
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
							{viewMode === 'list' ? (
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

	if (!isRolesEnabled && !isFeatureGateLoading) {
		return (
			<div className={styles.viewRolePage} data-testid="view-role-page">
				<div className={styles.viewRolePageHeader}>
					<div className={styles.viewRolePageHeaderLeft}>
						<Button
							variant="ghost"
							color="secondary"
							onClick={handleCancel}
							data-testid="cancel-button"
							className={styles.backButton}
						>
							<ArrowLeft size={16} />
						</Button>
						<Typography.Title level={3}>View Role</Typography.Title>
					</div>
				</div>

				<ErrorInPlace
					error={
						new APIError({
							httpStatusCode: 403,
							error: {
								code: 'FEATURE_DISABLED',
								message:
									'Custom roles feature is not available. Please check your license or feature configuration.',
								url: '',
								errors: [],
							},
						})
					}
					data-testid="feature-gate-error-banner"
				/>
			</div>
		);
	}

	if (isAuthZLoading || isLoading || isFeatureGateLoading) {
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
					<div className={styles.viewRolePageHeaderLeft}>
						<Button
							variant="ghost"
							color="secondary"
							onClick={handleCancel}
							data-testid="cancel-button"
							className={styles.backButton}
						>
							<ArrowLeft size={16} />
						</Button>
						<Typography.Title level={3}>Failed to load role</Typography.Title>
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
				<div className={styles.viewRolePageHeaderLeft}>
					<Button
						variant="ghost"
						color="secondary"
						onClick={handleCancel}
						data-testid="cancel-button"
						className={styles.backButton}
					>
						<ArrowLeft size={16} />
					</Button>
					<Typography.Title level={3}>
						{'Role - ' + role.name || 'Loading role...'}
					</Typography.Title>
				</div>

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
				error={deleteError}
				onCancel={handleCloseDeleteModal}
				onConfirm={handleConfirmDelete}
			/>
		</div>
	);
}

export default ViewRolePage;
