import { Button } from '@signozhq/button';
import { DialogFooter, DialogWrapper } from '@signozhq/dialog';
import { PowerOff, X } from '@signozhq/icons';

interface DisableAccountModalProps {
	open: boolean;
	accountName: string | null | undefined;
	isDisabling: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

function DisableAccountModal({
	open,
	accountName,
	isDisabling,
	onCancel,
	onConfirm,
}: DisableAccountModalProps): JSX.Element {
	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onCancel();
				}
			}}
			title={`Disable service account ${accountName ?? ''}?`}
			width="narrow"
			className="alert-dialog sa-disable-dialog"
			showCloseButton={false}
			disableOutsideClick={false}
		>
			<p className="sa-disable-dialog__body">
				Disabling this service account will revoke access for all its keys. Any
				systems using this account will lose access immediately.
			</p>
			<DialogFooter className="sa-disable-dialog__footer">
				<Button variant="solid" color="secondary" size="sm" onClick={onCancel}>
					<X size={12} />
					Cancel
				</Button>
				<Button
					variant="solid"
					color="destructive"
					size="sm"
					loading={isDisabling}
					onClick={onConfirm}
				>
					<PowerOff size={12} />
					Disable
				</Button>
			</DialogFooter>
		</DialogWrapper>
	);
}

export default DisableAccountModal;
