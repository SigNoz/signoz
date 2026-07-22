import { useCallback, useState } from 'react';
import { matchPath, useHistory, useLocation } from 'react-router-dom';
import { ArrowLeft, SolidAlertTriangle } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { ConfirmDialog } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { Skeleton } from 'antd';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import ROUTES from 'constants/routes';
import { useRolesFeatureGate } from 'hooks/useRolesFeatureGate';
import useUrlQuery from 'hooks/useUrlQuery';
import { useNavigationBlocker } from 'hooks/useNavigationBlocker';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { withAuthZPage } from 'lib/authz/components/withAuthZ/withAuthZPage';
import { RouterContext } from 'lib/authz/components/withAuthZ/withAuthZ';
import {
	buildRoleReadPermission,
	buildRoleUpdatePermission,
	RoleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';
import APIError from 'types/api/error';

import PermissionEditor from './components/PermissionEditor';
import { useCreateEditRolePageActions } from './useCreateEditRolePageActions';

import styles from './CreateEditRolePage.module.scss';
import { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

function authzCheckFn(
	_props: object,
	router: RouterContext,
): BrandedPermission[] {
	const match = router.matchPath<{ roleId: string }>(ROUTES.ROLE_DETAILS);
	const roleId = match?.roleId ?? 'new';
	const roleName = router.searchParams.get('name') ?? '';
	const isCreateMode = roleId === 'new';

	if (isCreateMode) {
		return [RoleCreatePermission];
	}
	if (roleName) {
		return [
			buildRoleReadPermission(roleName),
			buildRoleUpdatePermission(roleName),
		];
	}
	return [];
}

function CreateEditRolePageContent(): JSX.Element {
	const history = useHistory();
	const { pathname } = useLocation();
	const urlQuery = useUrlQuery();
	const match = matchPath<{ roleId: string }>(pathname, {
		path: ROUTES.ROLE_DETAILS,
	});
	const roleId = match?.params?.roleId ?? 'new';
	const roleName = urlQuery.get('name') ?? '';
	const [hasJsonError, setHasJsonError] = useState(false);
	const { isRolesEnabled, isLoading: isFeatureGateLoading } =
		useRolesFeatureGate();

	const {
		formData,
		editorMode,
		setEditorMode,
		resources,
		setResources,
		isLoading,
		isSaving,
		hasUnsavedChanges,
		handleSave,
		handleCancel,
		handleFormChange,
		saveError,
		validationErrors,
		isCreateMode,
		loadError,
	} = useCreateEditRolePageActions(roleId, roleName);

	const { isBlocked, confirmNavigation, cancelNavigation, allowNextNavigation } =
		useNavigationBlocker(hasUnsavedChanges);

	const handleSaveAndNavigate = useCallback(async (): Promise<void> => {
		if (hasJsonError) {
			return;
		}

		const success = await handleSave();
		if (success) {
			allowNextNavigation();
			if (isCreateMode) {
				history.push(ROUTES.ROLES_SETTINGS);
			} else {
				const viewUrl = `${ROUTES.ROLE_DETAILS.replace(':roleId', roleId)}?name=${encodeURIComponent(roleName)}`;
				history.push(viewUrl);
			}
		}
	}, [
		handleSave,
		allowNextNavigation,
		history,
		hasJsonError,
		isCreateMode,
		roleId,
		roleName,
	]);

	if (!isRolesEnabled && !isFeatureGateLoading) {
		return (
			<div
				className={styles.createEditRolePage}
				data-testid="create-edit-role-page"
			>
				<div className={styles.createEditRolePageHeader}>
					<div className={styles.createEditRolePageHeaderLeft}>
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
							{isCreateMode ? 'Create Role' : 'Edit Role'}
						</Typography.Title>
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

	if ((isLoading && !isCreateMode) || isFeatureGateLoading) {
		return (
			<div className={styles.createEditRolePage}>
				<Skeleton active paragraph={{ rows: 8 }} />
			</div>
		);
	}

	if (loadError) {
		return (
			<div
				className={styles.createEditRolePage}
				data-testid="create-edit-role-page"
			>
				<div className={styles.createEditRolePageHeader}>
					<div className={styles.createEditRolePageHeaderLeft}>
						<Button
							variant="ghost"
							color="secondary"
							onClick={handleCancel}
							disabled={isSaving}
							data-testid="cancel-button"
							className={styles.backButton}
						>
							<ArrowLeft size={16} />
						</Button>
						<Typography.Title level={3}>Failed to load role</Typography.Title>
					</div>
				</div>

				<ErrorInPlace error={loadError} data-testid="role-load-error-banner" />
			</div>
		);
	}

	return (
		<div
			className={styles.createEditRolePage}
			data-testid="create-edit-role-page"
		>
			<div className={styles.createEditRolePageHeader}>
				<div className={styles.createEditRolePageHeaderLeft}>
					<Button
						variant="ghost"
						color="secondary"
						onClick={handleCancel}
						disabled={isSaving}
						data-testid="cancel-button"
						className={styles.backButton}
					>
						<ArrowLeft size={16} />
					</Button>
					<Typography.Title level={3}>
						{isCreateMode
							? 'Create Role'
							: `Role - ${formData.name || 'Loading role...'}`}
					</Typography.Title>
				</div>

				<div className={styles.createEditRolePageActions}>
					{hasUnsavedChanges && (
						<div className={styles.unsavedIndicator}>
							<span className={styles.unsavedDot} />
							<Typography as="span" size="base" className={styles.unsavedText}>
								Unsaved changes
							</Typography>
						</div>
					)}
					<AuthZButton
						checks={
							isCreateMode
								? [RoleCreatePermission]
								: [buildRoleUpdatePermission(roleName)]
						}
						variant="solid"
						color="primary"
						onClick={handleSaveAndNavigate}
						loading={isSaving}
						disabled={!hasUnsavedChanges || hasJsonError}
						data-testid="save-button"
					>
						{isCreateMode ? 'Create role' : 'Save changes'}
					</AuthZButton>
				</div>
			</div>

			{saveError && (
				<ErrorInPlace
					error={saveError}
					height="auto"
					data-testid="save-error-banner"
					padding={0}
					bordered={true}
					className={styles.errorInPlaceContainer}
				/>
			)}

			<div className={styles.createEditRolePageContent}>
				<div className={styles.createEditRolePageForm}>
					<div className={styles.formRow}>
						{isCreateMode ? (
							<div className={styles.formField}>
								<label htmlFor="role-name" className={styles.formLabel}>
									Name
								</label>
								<Input
									id="role-name"
									value={formData.name}
									onChange={(e): void => handleFormChange('name', e.target.value)}
									placeholder="my-custom-role"
									data-testid="role-name-input"
								/>
							</div>
						) : null}
						<div className={styles.formField}>
							<label htmlFor="role-description" className={styles.formLabel}>
								Description
							</label>
							<Input
								id="role-description"
								value={formData.description}
								onChange={(e): void => handleFormChange('description', e.target.value)}
								placeholder="Custom role for the support team"
								data-testid="role-description-input"
							/>
						</div>
					</div>
				</div>

				<div className={styles.createEditRolePageDivider} />

				<PermissionEditor
					resources={resources}
					mode={editorMode}
					onModeChange={setEditorMode}
					onResourceChange={setResources}
					onJsonValidityChange={setHasJsonError}
					isLoading={isLoading}
					validationErrors={validationErrors}
				/>
			</div>

			<ConfirmDialog
				open={isBlocked}
				onOpenChange={(next): void => {
					if (!next) {
						cancelNavigation();
					}
				}}
				title="Discard unsaved changes?"
				titleIcon={<SolidAlertTriangle size={14} color="#fdd600" />}
				confirmText="Discard"
				confirmColor="destructive"
				cancelText="Keep editing"
				onConfirm={confirmNavigation}
				onCancel={cancelNavigation}
				data-testid="discard-changes-dialog"
			>
				<Typography>
					{isCreateMode
						? 'This new role will not be created.'
						: 'Your unsaved changes will be lost.'}
				</Typography>
			</ConfirmDialog>
		</div>
	);
}

export default withAuthZPage(CreateEditRolePageContent, {
	checks: authzCheckFn,
	fallbackOnLoading: (
		<div className={styles.createEditRolePage}>
			<Skeleton active paragraph={{ rows: 8 }} />
		</div>
	),
});
