import { useCallback, useState } from 'react';
import { SolidAlertTriangle, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { ConfirmDialog } from '@signozhq/ui/dialog';
import { Divider } from '@signozhq/ui/divider';
import { Typography } from '@signozhq/ui/typography';

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
	const [isDiscardOpen, setIsDiscardOpen] = useState(false);

	// Closing with unsaved edits prompts for confirmation; a pristine panel closes
	// straight away.
	const handleCloseClick = useCallback((): void => {
		if (isDirty) {
			setIsDiscardOpen(true);
		} else {
			onClose();
		}
	}, [isDirty, onClose]);

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
				open={isDiscardOpen}
				onOpenChange={(next): void => {
					if (!next) {
						setIsDiscardOpen(false);
					}
				}}
				title="Discard changes?"
				titleIcon={<SolidAlertTriangle size={14} color="#fdd600" />}
				confirmText="Discard"
				confirmColor="destructive"
				cancelText="Keep editing"
				onConfirm={onClose}
				onCancel={(): void => setIsDiscardOpen(false)}
				data-testid="panel-editor-v2-discard-modal"
			>
				<Typography>Your unsaved edits to this panel will be lost.</Typography>
			</ConfirmDialog>
		</div>
	);
}

export default Header;
