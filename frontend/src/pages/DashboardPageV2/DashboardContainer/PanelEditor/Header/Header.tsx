import { useCallback } from 'react';
import { SolidAlertTriangle, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Divider } from '@signozhq/ui/divider';
import { Typography } from '@signozhq/ui/typography';
import { useConfirmableAction } from 'hooks/useConfirmableAction';

import DisabledControlTooltip from '../../components/DisabledControlTooltip/DisabledControlTooltip';
import styles from './Header.module.scss';

interface HeaderProps {
	isDirty: boolean;
	isSaving: boolean;
	showSwitchToView?: boolean;
	/** Locked/no-permission dashboard — Save is disabled with a reason. */
	readOnly?: boolean;
	readOnlyReason?: string;
	onSave: () => void;
	onSwitchToView?: () => void;
	onClose: () => void;
}

function Header({
	isDirty,
	isSaving,
	showSwitchToView = false,
	readOnly = false,
	readOnlyReason,
	onSave,
	onSwitchToView,
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
				{showSwitchToView && (
					<Button
						variant="outlined"
						color="secondary"
						data-testid="panel-editor-v2-switch-to-view"
						onClick={onSwitchToView}
					>
						Switch to View Mode
					</Button>
				)}
				<DisabledControlTooltip reason={readOnlyReason ?? ''} disabled={readOnly}>
					<Button
						variant="solid"
						color="primary"
						data-testid="panel-editor-v2-save"
						disabled={readOnly || !isDirty || isSaving}
						loading={!readOnly && isSaving}
						onClick={readOnly ? undefined : onSave}
					>
						Save changes
					</Button>
				</DisabledControlTooltip>
			</div>

			<DialogWrapper
				open={discard.open}
				onOpenChange={(next: boolean): void => {
					if (!next) {
						discard.cancel();
					}
				}}
				title="Discard changes?"
				titleIcon={<SolidAlertTriangle size={14} color="#fdd600" />}
				testId="panel-editor-v2-discard-modal"
				footer={
					<>
						<Button
							type="button"
							variant="solid"
							color="destructive"
							data-testid="panel-editor-v2-discard-confirm"
							loading={discard.isPending}
							onClick={discard.confirm}
						>
							Discard
						</Button>
						<Button
							type="button"
							variant="outlined"
							color="secondary"
							data-testid="panel-editor-v2-discard-cancel"
							onClick={discard.cancel}
						>
							Keep editing
						</Button>
					</>
				}
			>
				<Typography>Your unsaved edits to this panel will be lost.</Typography>
			</DialogWrapper>
		</div>
	);
}

export default Header;
