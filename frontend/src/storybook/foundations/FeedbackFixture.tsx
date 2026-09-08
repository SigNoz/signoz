import { useState } from 'react';
import { Trash2, TriangleAlert } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { ConfirmDialog } from '@signozhq/ui/dialog';
import { Toaster, toast } from '@signozhq/ui/sonner';

import MessageTip from '@/components/MessageTip';

export type FeedbackState =
	| 'success-toast'
	| 'actionable-error-toast'
	| 'long-toast'
	| 'inline-alert'
	| 'confirmation'
	| 'toast-over-confirmation';

interface FeedbackFixtureProps {
	state: FeedbackState;
}

const longMessage =
	'We could not apply the retention policy because the selected storage tier is unavailable. Review the workspace settings, then try again.';

function FeedbackFixture({ state }: FeedbackFixtureProps): JSX.Element {
	const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

	const showToast = (): void => {
		if (state === 'success-toast') {
			toast.success('Retention policy updated successfully');
			return;
		}

		if (state === 'actionable-error-toast') {
			toast.error('Failed to save the notification channel', {
				action: { label: 'Retry', onClick: (): void => undefined },
			});
			return;
		}

		toast.error(longMessage, { duration: Infinity });
	};

	const isToastStory =
		state === 'success-toast' ||
		state === 'actionable-error-toast' ||
		state === 'long-toast';
	const confirmationTitle = 'Delete environment';

	return (
		<>
			{isToastStory && (
				<Button data-testid="show-feedback-toast" onClick={showToast}>
					Show feedback
				</Button>
			)}
			{state === 'inline-alert' && (
				<MessageTip
					action={
						<Button color="secondary" size="sm" variant="outlined">
							Review settings
						</Button>
					}
					message="Some collectors have not reported data in the last 15 minutes."
					show
				/>
			)}
			{(state === 'confirmation' || state === 'toast-over-confirmation') && (
				<>
					<Button
						data-testid="open-feedback-confirmation"
						onClick={(): void => setIsConfirmationOpen(true)}
					>
						Delete environment
					</Button>
					<ConfirmDialog
						cancelText="Cancel"
						confirmColor="destructive"
						confirmIcon={<Trash2 size={14} />}
						confirmText="Delete environment"
						disableOutsideClick
						open={isConfirmationOpen}
						title={confirmationTitle}
						titleIcon={<TriangleAlert size={14} />}
						onCancel={(): void => setIsConfirmationOpen(false)}
						onConfirm={(): boolean => {
							setIsConfirmationOpen(false);
							return true;
						}}
						onOpenChange={setIsConfirmationOpen}
					>
						This removes the environment and its saved views. This action cannot be
						undone.
						{state === 'toast-over-confirmation' && (
							<Button
								color="secondary"
								size="sm"
								variant="outlined"
								onClick={showToast}
							>
								Show error notification
							</Button>
						)}
					</ConfirmDialog>
				</>
			)}
			<Toaster closeButton position="top-right" />
		</>
	);
}

export default FeedbackFixture;
