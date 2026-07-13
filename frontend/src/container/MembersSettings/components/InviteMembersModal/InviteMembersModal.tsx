import { useCallback } from 'react';
import { X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { toast } from '@signozhq/ui/sonner';
import InviteMembers from 'components/InviteMembers/InviteMembers';

import './InviteMembersModal.styles.scss';

export interface InviteMembersModalProps {
	open: boolean;
	onClose: () => void;
	onComplete?: () => void;
}

function InviteMembersModal({
	open,
	onClose,
	onComplete,
}: InviteMembersModalProps): JSX.Element {
	const handleSuccess = useCallback((): void => {
		toast.success('Invites sent successfully', { position: 'top-right' });
		onClose();
		onComplete?.();
	}, [onClose, onComplete]);

	const handlePartialSuccess = useCallback((): void => {
		toast.warning('Some invites failed', { position: 'top-right' });
		onComplete?.();
	}, [onComplete]);

	return (
		<DialogWrapper
			title="Invite Team Members"
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			showCloseButton
			width="wide"
			className="invite-members-modal"
		>
			<InviteMembers
				onSuccess={handleSuccess}
				onPartialSuccess={handlePartialSuccess}
				renderFooter={({ submit, canSubmit, isSubmitting }): JSX.Element => (
					<div className="invite-members-modal__footer">
						<Button type="button" variant="solid" color="secondary" onClick={onClose}>
							<X size={12} />
							Cancel
						</Button>

						<Button
							variant="solid"
							color="primary"
							onClick={submit}
							disabled={!canSubmit}
							loading={isSubmitting}
						>
							{isSubmitting ? 'Inviting...' : 'Invite Team Members'}
						</Button>
					</div>
				)}
			/>
		</DialogWrapper>
	);
}

export default InviteMembersModal;
