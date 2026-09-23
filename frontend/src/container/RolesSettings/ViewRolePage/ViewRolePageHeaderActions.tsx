import styles from 'container/RolesSettings/ViewRolePage/ViewRolePage.module.scss';
import { Button } from '@signozhq/ui/button';
import { Divider } from '@signozhq/ui/divider';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import {
	buildRoleDeletePermission,
	buildRoleReadPermission,
	buildRoleUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';
import { Tooltip } from '@signozhq/ui/tooltip';

export function ViewRolePageHeaderActions({
	isRoleLoading,
	isManaged,
	roleName,
	handleOpenDeleteModal,
	handleRedirectToUpdate,
}: {
	isRoleLoading: boolean;
	isManaged: boolean;
	roleName: string;
	handleOpenDeleteModal: () => void;
	handleRedirectToUpdate: () => void;
}): JSX.Element {
	const renderDeleteButton = (): JSX.Element => {
		if (isRoleLoading) {
			return (
				<Button
					disabledTooltip={undefined}
					size="md"
					variant="link"
					color="danger"
					disabled
					testId="delete-button"
					className={styles.deleteButton}
				>
					Delete
				</Button>
			);
		}

		if (isManaged) {
			return (
				<Tooltip title="Managed roles cannot be deleted">
					<Button
						disabledTooltip={undefined}
						size="md"
						variant="link"
						color="danger"
						disabled
						testId="delete-button"
						className={styles.deleteButton}
					>
						Delete
					</Button>
				</Tooltip>
			);
		}

		return (
			<AuthZButton
				size="md"
				checks={[buildRoleDeletePermission(roleName)]}
				authZEnabled={!!roleName}
				variant="link"
				color="danger"
				onClick={handleOpenDeleteModal}
				data-testid="delete-button"
				className={styles.deleteButton}
			>
				Delete
			</AuthZButton>
		);
	};

	const renderUpdateButton = (): JSX.Element => {
		if (isRoleLoading) {
			return (
				<Button
					disabledTooltip={undefined}
					size="md"
					variant="solid"
					color="primary"
					disabled
					testId="save-button"
				>
					Update
				</Button>
			);
		}

		if (isManaged) {
			return (
				<Tooltip title="Managed roles cannot be updated">
					<Button
						disabledTooltip={undefined}
						size="md"
						variant="solid"
						color="primary"
						disabled
						testId="save-button"
					>
						Update
					</Button>
				</Tooltip>
			);
		}

		return (
			<AuthZButton
				size="md"
				checks={[
					buildRoleReadPermission(roleName),
					buildRoleUpdatePermission(roleName),
				]}
				authZEnabled={!!roleName}
				variant="solid"
				color="primary"
				data-testid="save-button"
				onClick={handleRedirectToUpdate}
			>
				Update
			</AuthZButton>
		);
	};

	return (
		<div className={styles.viewRolePageActions}>
			{renderDeleteButton()}
			<Divider type="vertical" />
			{renderUpdateButton()}
		</div>
	);
}
