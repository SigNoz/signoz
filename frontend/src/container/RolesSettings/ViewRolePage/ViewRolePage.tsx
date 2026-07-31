import { useMemo } from 'react';
import { ArrowLeft } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Divider } from '@signozhq/ui/divider';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Tabs } from '@signozhq/ui/tabs';
import { Typography } from '@signozhq/ui/typography';
import { Skeleton } from 'antd';
import { useGetRole } from 'api/generated/services/role';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { useDeleteRoleModal } from 'container/RolesSettings/DeleteRoleModal/useDeleteRoleModal';
import { transformApiToRolePermissions } from 'container/RolesSettings/hooks/useRolePermissions';
import { useRolesFeatureGate } from 'hooks/useRolesFeatureGate';
import { withAuthZContent } from 'lib/authz/components/withAuthZ/withAuthZContent';
import { buildRoleReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';
import { useTimezone } from 'providers/Timezone';
import APIError from 'types/api/error';
import { RoleType } from 'types/roles';
import { toAPIError } from 'utils/errorUtils';

import DeleteRoleModal from '../DeleteRoleModal/DeleteRoleModal';
import PermissionOverview from './components/PermissionOverview';
import ReadOnlyJsonViewer from './ReadOnlyJsonViewer';
import { useViewRolePageActions } from './useViewRolePageActions';

import styles from './ViewRolePage.module.scss';
import { ViewRolePageHeader } from 'container/RolesSettings/ViewRolePage/ViewRolePageHeader';

interface ViewRoleContentProps {
	roleId: string;
	roleName: string;
	viewMode: 'list' | 'json';
	expandedResources: Set<string>;
	setExpandedResources: (resources: Set<string>) => void;
	handleModeChange: (value: string) => void;
	handleTabChange: (key: string) => void;
	activeTab: 'overview';
}

function ViewRoleContentInner({
	roleId,
	viewMode,
	expandedResources,
	setExpandedResources,
	handleModeChange,
	handleTabChange,
	activeTab,
}: ViewRoleContentProps): JSX.Element {
	const { formatTimezoneAdjustedTimestampOptional } = useTimezone();

	const { data, isLoading, error } = useGetRole(
		{ id: roleId },
		{ query: { enabled: !!roleId } },
	);
	const role = data?.data;

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
									roleId={roleId}
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

	if (isLoading) {
		return <Skeleton active paragraph={{ rows: 6 }} />;
	}

	if (error) {
		return (
			<ErrorInPlace
				error={toAPIError(error, 'Failed to load role details')}
				data-testid="role-error-banner"
			/>
		);
	}

	if (!role) {
		return <></>;
	}

	return (
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
	);
}

const ViewRoleContent = withAuthZContent<ViewRoleContentProps>(
	ViewRoleContentInner,
	{
		checks: (props: ViewRoleContentProps) =>
			props.roleName ? [buildRoleReadPermission(props.roleName)] : [],
		fallbackOnLoading: <Skeleton active paragraph={{ rows: 6 }} />,
	},
);

function ViewRolePage(): JSX.Element {
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

	const { data, isLoading: isRoleLoading } = useGetRole(
		{ id: roleId ?? '' },
		{ query: { enabled: !!roleId } },
	);
	const role = data?.data;
	const isManaged = role?.type === RoleType.MANAGED;

	const {
		isDeleteModalOpen,
		deleteError,
		handleOpenDeleteModal,
		handleCloseDeleteModal,
		handleConfirmDelete,
	} = useDeleteRoleModal({
		roleId,
		isManaged: isManaged ?? false,
		onDeleteSuccess: handleCancel,
	});

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

	if (isFeatureGateLoading) {
		return (
			<div className={styles.viewRolePage}>
				<Skeleton active paragraph={{ rows: 8 }} />
			</div>
		);
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
						{'Role - ' + (roleName || 'Loading role...')}
					</Typography.Title>
				</div>

				<ViewRolePageHeader
					isRoleLoading={isRoleLoading}
					isManaged={isManaged}
					roleName={roleName}
					handleOpenDeleteModal={handleOpenDeleteModal}
					handleRedirectToUpdate={handleRedirectToUpdate}
				/>
			</div>

			{roleId && (
				<ViewRoleContent
					roleId={roleId}
					roleName={roleName}
					viewMode={viewMode}
					expandedResources={expandedResources}
					setExpandedResources={setExpandedResources}
					handleModeChange={handleModeChange}
					handleTabChange={handleTabChange}
					activeTab={activeTab}
				/>
			)}

			<DeleteRoleModal
				isOpen={isDeleteModalOpen}
				roleName={roleName}
				error={deleteError}
				onCancel={handleCloseDeleteModal}
				onConfirm={handleConfirmDelete}
			/>
		</div>
	);
}

export default ViewRolePage;
