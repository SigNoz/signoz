import { Check, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';

import styles from './ApplyToAllDialog.module.scss';

interface ApplyToAllDialogProps {
	open: boolean;
	variableName: string;
	isLoading: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

/** Confirms applying a dynamic variable as a filter to every panel. */
function ApplyToAllDialog({
	open,
	variableName,
	isLoading,
	onConfirm,
	onClose,
}: ApplyToAllDialogProps): JSX.Element {
	const footer = (
		<div className={styles.footer}>
			<Button variant="solid" color="secondary" onClick={onClose}>
				<X size={12} />
				Cancel
			</Button>
			<Button
				variant="solid"
				color="primary"
				loading={isLoading}
				onClick={onConfirm}
				testId="confirm-apply-to-all"
			>
				<Check size={12} />
				Apply to all
			</Button>
		</div>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title="Apply variable to all panels"
			width="narrow"
			showCloseButton={false}
			// Lift above the settings drawer (z ~1000); overlay off (it would only half-dim).
			style={{ zIndex: 1100 }}
			showOverlay={false}
			footer={footer}
		>
			<div className={styles.body}>
				Add <span className={styles.variableName}>${variableName}</span> as a filter
				to every panel on this dashboard. Panels that already reference it are left
				unchanged.
			</div>
		</DialogWrapper>
	);
}

export default ApplyToAllDialog;
