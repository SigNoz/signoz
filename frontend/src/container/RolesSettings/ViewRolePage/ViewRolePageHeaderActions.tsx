import styles from 'container/RolesSettings/ViewRolePage/ViewRolePage.module.scss';
import { Button } from '@signozhq/ui/button';
import { Divider } from '@signozhq/ui/divider';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import {
	buildRoleDeletePermission,
	buildRoleReadPermission,
	buildRoleUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/role.permissions';

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
					size="md"
					variant="link"
					color="danger"
					loading
					testId="delete-button"
				>
					Delete
				</Button>
			);
		}

		if (isManaged) {
			return (
				<Button
					size="md"
					variant="link"
					color="danger"
					disabled
					disabledTooltip="Managed roles cannot be deleted"
					testId="delete-button"
				>
					Delete
				</Button>
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
			>
				Delete
			</AuthZButton>
		);
	};

	const renderUpdateButton = (): JSX.Element => {
		if (isRoleLoading) {
			return (
				<Button
					size="md"
					variant="solid"
					color="primary"
					loading
					testId="save-button"
				>
					Update
				</Button>
			);
		}

		if (isManaged) {
			return (
				<Button
					size="md"
					variant="solid"
					color="primary"
					disabled
					disabledTooltip="Managed roles cannot be updated"
					testId="save-button"
				>
					Update
				</Button>
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
