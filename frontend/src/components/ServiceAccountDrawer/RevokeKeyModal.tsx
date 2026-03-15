import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { Trash2, X } from '@signozhq/icons';

export interface RevokeKeyContentProps {
	keyName: string | null | undefined;
	isRevoking: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export function RevokeKeyContent({
	isRevoking,
	onCancel,
	onConfirm,
}: RevokeKeyContentProps): JSX.Element {
	return (
		<>
			<p className="delete-dialog__body">
				Revoking this key will permanently invalidate it. Any systems using this key
				will lose access immediately.
			</p>
			<DialogFooter className="delete-dialog__footer">
				<Button variant="solid" color="secondary" size="sm" onClick={onCancel}>
					<X size={12} />
					Cancel
				</Button>
				<Button
					variant="solid"
					color="destructive"
					size="sm"
					loading={isRevoking}
					onClick={onConfirm}
				>
					<Trash2 size={12} />
					Revoke Key
				</Button>
			</DialogFooter>
		</>
	);
}

interface RevokeKeyModalProps extends RevokeKeyContentProps {
	open: boolean;
}

function RevokeKeyModal({
	open,
	keyName,
	isRevoking,
	onCancel,
	onConfirm,
}: RevokeKeyModalProps): JSX.Element {
	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onCancel();
				}
			}}
			title={`Revoke ${keyName ?? 'key'}?`}
			width="narrow"
			className="alert-dialog delete-dialog"
			showCloseButton={false}
			disableOutsideClick={false}
		>
			<RevokeKeyContent
				keyName={keyName}
				isRevoking={isRevoking}
				onCancel={onCancel}
				onConfirm={onConfirm}
			/>
		</DialogWrapper>
	);
}

export default RevokeKeyModal;
