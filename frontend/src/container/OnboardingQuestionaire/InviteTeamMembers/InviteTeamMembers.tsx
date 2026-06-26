import { ArrowRight, LoaderCircle } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import logEvent from 'api/common/logEvent';
import InviteMembers from 'components/InviteMembers/InviteMembers';
import { useNotifications } from 'hooks/useNotifications';

import { OnboardingQuestionHeader } from '../OnboardingQuestionHeader';

import './InviteTeamMembers.styles.scss';

interface InviteTeamMembersProps {
	isLoading: boolean;
	onNext: () => void;
}

function InviteTeamMembers({
	isLoading,
	onNext,
}: InviteTeamMembersProps): JSX.Element {
	const { notifications } = useNotifications();

	const handleSuccess = (): void => {
		logEvent('Org Onboarding: Invite Team Members Success', {});
		notifications.success({
			message: 'Invites sent successfully!',
		});
		setTimeout(() => {
			onNext();
		}, 1000);
	};

	const handlePartialSuccess = (): void => {
		logEvent('Org Onboarding: Invite Team Members Partial Success', {});
		notifications.warning({
			message: 'Some invites failed. Check the errors above.',
		});
	};

	const handleAllFailed = (): void => {
		logEvent('Org Onboarding: Invite Team Members Failed', {});
	};

	const handleDoLater = (): void => {
		logEvent('Org Onboarding: Clicked Do Later', {
			currentPageID: 4,
		});
		onNext();
	};

	return (
		<div className="questions-container">
			<OnboardingQuestionHeader
				title="Invite your team"
				subtitle="SigNoz is a lot more useful with collaborators on board."
			/>

			<div className="questions-form-container">
				<div className="questions-form invite-team-members-form">
					<div className="form-group">
						<div className="question-label">
							Invite your team to the SigNoz workspace
						</div>

						<InviteMembers
							onSuccess={handleSuccess}
							onPartialSuccess={handlePartialSuccess}
							onAllFailed={handleAllFailed}
							showHeader
							renderFooter={({ submit, canSubmit, isSubmitting }): JSX.Element => {
								const isButtonDisabled = isSubmitting || isLoading;
								const isInviteButtonDisabled = isButtonDisabled || !canSubmit;

								return (
									<div className="onboarding-buttons-container">
										<Button
											variant="solid"
											color="primary"
											className={`onboarding-next-button ${
												isInviteButtonDisabled ? 'disabled' : ''
											}`}
											onClick={submit}
											disabled={isInviteButtonDisabled}
											data-testid="send-invites-button"
											suffix={
												isButtonDisabled ? (
													<LoaderCircle className="animate-spin" size={12} />
												) : (
													<ArrowRight size={12} />
												)
											}
										>
											Send Invites
										</Button>
										<Button
											variant="ghost"
											color="secondary"
											className="onboarding-do-later-button"
											onClick={handleDoLater}
											disabled={isButtonDisabled}
											data-testid="do-later-button"
										>
											I&apos;ll do this later
										</Button>
									</div>
								);
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default InviteTeamMembers;
