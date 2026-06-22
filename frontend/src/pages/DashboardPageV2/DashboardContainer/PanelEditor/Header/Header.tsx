import { useCallback } from 'react';
import { SolidAlertTriangle, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { ConfirmDialog } from '@signozhq/ui/dialog';
import { Divider } from '@signozhq/ui/divider';
import { Typography } from '@signozhq/ui/typography';
import { useConfirmableAction } from 'hooks/useConfirmableAction';

import styles from './Header.module.scss';

interface HeaderProps {
	isDirty: boolean;
	isSaving: boolean;
	onSave: () => void;
	onClose: () => void;
}

function Header({
	isDirty,
	isSaving,
	onSave,
	onClose,
}: HeaderProps): JSX.Element {
	const discard = useConfirmableAction(
		useCallback(async (): Promise<void> => onClose(), [onClose]),
	);

	// Confirm before closing with unsaved edits; a pristine panel closes straight away.
	const handleCloseClick = useCallback((): void => {
		if (isDirty) {
			discard.request();
		} else {
			onClose();
		}
	}, [isDirty, onClose, discard]);

	return (
		<div className={styles.header}>
			<div className={styles.title}>
				<Button
					variant="ghost"
					color="secondary"
					size="icon"
					suffix={<X size={14} />}
					data-testid="panel-editor-v2-close"
					onClick={handleCloseClick}
				/>
				<Divider type="vertical" />
				<Typography.Text>Configure panel</Typography.Text>
			</div>
			<div className={styles.actions}>
				<Button
					variant="solid"
					color="primary"
					data-testid="panel-editor-v2-save"
					disabled={!isDirty || isSaving}
					loading={isSaving}
					onClick={onSave}
				>
					Save changes
				</Button>
			</div>

			<ConfirmDialog
				open={discard.open}
				onOpenChange={(next): void => {
					if (!next) {
						discard.cancel();
					}
				}}
				title="Discard changes?"
				titleIcon={<SolidAlertTriangle size={14} color="#fdd600" />}
				confirmText="Discard"
				confirmColor="destructive"
				cancelText="Keep editing"
				onConfirm={discard.confirm}
				onCancel={discard.cancel}
				data-testid="panel-editor-v2-discard-modal"
			>
				<Typography>Your unsaved edits to this panel will be lost.</Typography>
			</ConfirmDialog>
		</div>
	);
}

export default Header;
