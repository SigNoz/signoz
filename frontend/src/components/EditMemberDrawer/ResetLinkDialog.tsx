import { Button } from '@signozhq/button';
import { DialogWrapper } from '@signozhq/dialog';
import { Check, Copy } from '@signozhq/icons';

interface ResetLinkDialogProps {
	open: boolean;
	linkType: 'invite' | 'reset' | null;
	resetLink: string | null;
	hasCopied: boolean;
	onClose: () => void;
	onCopy: () => void;
}

function ResetLinkDialog({
	open,
	linkType,
	resetLink,
	hasCopied,
	onClose,
	onCopy,
}: ResetLinkDialogProps): JSX.Element {
	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title={linkType === 'invite' ? 'Invite Link' : 'Password Reset Link'}
			showCloseButton
			width="base"
			className="reset-link-dialog"
		>
			<div className="reset-link-dialog__content">
				<p className="reset-link-dialog__description">
					{linkType === 'invite'
						? 'Share this one-time link with the team member to complete their account setup.'
						: 'This creates a one-time link the team member can use to set a new password for their SigNoz account.'}
				</p>
				<div className="reset-link-dialog__link-row">
					<div className="reset-link-dialog__link-text-wrap">
						<span className="reset-link-dialog__link-text">{resetLink}</span>
					</div>
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						onClick={onCopy}
						prefixIcon={hasCopied ? <Check size={12} /> : <Copy size={12} />}
						className="reset-link-dialog__copy-btn"
					>
						{hasCopied ? 'Copied!' : 'Copy'}
					</Button>
				</div>
			</div>
		</DialogWrapper>
	);
}

export default ResetLinkDialog;
