import { SolidAlertTriangle } from '@signozhq/icons';
import { ConfirmDialog } from '@signozhq/ui/dialog';
import { Typography } from '@signozhq/ui/typography';

export interface DiscardChangesModalProps {
	open: boolean;
	isNewPanel: boolean;
	panelTitle?: string;
	dashboardTitle?: string;
	onDiscard: () => void;
	onClose: () => void;
}

export default function DiscardChangesModal({
	open,
	isNewPanel,
	panelTitle,
	dashboardTitle,
	onDiscard,
	onClose,
}: DiscardChangesModalProps): JSX.Element {
	const dashboardName = dashboardTitle ? (
		<>
			{' '}
			to <strong>{dashboardTitle}</strong>
		</>
	) : null;
	const panelLabel = panelTitle ? <strong>{panelTitle}</strong> : 'this panel';

	return (
		<ConfirmDialog
			open={open}
			onOpenChange={(next): void => {
				if (!next) {
					onClose();
				}
			}}
			title="Discard changes?"
			titleIcon={<SolidAlertTriangle size={14} color="#fdd600" />}
			confirmText="Discard"
			confirmColor="destructive"
			cancelText="Keep editing"
			onConfirm={onDiscard}
			onCancel={onClose}
		>
			{isNewPanel ? (
				<Typography>This new panel won&apos;t be added{dashboardName}.</Typography>
			) : (
				<Typography>Your unsaved edits to {panelLabel} will be lost.</Typography>
			)}
		</ConfirmDialog>
	);
}
