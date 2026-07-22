import { useMemo } from 'react';
import { ArrowRight, LoaderCircle } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import logEvent from 'api/common/logEvent';
import InviteMembers from 'components/InviteMembers/InviteMembers';
import { InviteMemberRow, InviteResult } from 'components/InviteMembers/types';
import { useRoles } from 'components/RolesSelect/RolesSelect';
import { useNotifications } from 'hooks/useNotifications';
import { getBaseUrl } from 'utils/basePath';

import { OnboardingQuestionHeader } from '../OnboardingQuestionHeader';

import './InviteTeamMembers.styles.scss';

interface TeamMember {
	email: string;
	role: string;
	name: string;
	frontendBaseUrl: string;
	id: string;
}

interface InviteTeamMembersProps {
	isLoading: boolean;
	onNext: () => void;
}

function InviteTeamMembers({
	isLoading,
	onNext,
}: InviteTeamMembersProps): JSX.Element {
	const { notifications } = useNotifications();
	const { roles } = useRoles();

	const roleIdToName = useMemo(() => {
		const map: Record<string, string> = {};
		roles.forEach((role) => {
			if (role.id && role.name) {
				map[role.id] = role.name;
			}
		});
		return map;
	}, [roles]);

	const toTeamMembers = (rows: InviteMemberRow[]): TeamMember[] =>
		rows.map((row) => ({
			email: row.email,
			role: roleIdToName[row.roleId] ?? row.roleId,
			name: '',
			frontendBaseUrl: getBaseUrl(),
			id: row.id,
		}));

	const handleSuccess = (
		_results: InviteResult[],
		rows: InviteMemberRow[],
	): void => {
		logEvent('Org Onboarding: Invite Team Members Success', {
			teamMembers: toTeamMembers(rows),
		});
		notifications.success({
			message: 'Invites sent successfully!',
		});
		setTimeout(() => {
			onNext();
		}, 1000);
	};

	const handlePartialSuccess = (
		_results: InviteResult[],
		rows: InviteMemberRow[],
	): void => {
		logEvent('Org Onboarding: Invite Team Members Partial Success', {
			teamMembers: toTeamMembers(rows),
		});
		notifications.warning({
			message: 'Some invites failed. Check the errors above.',
		});
	};

	const handleAllFailed = (
		_results: InviteResult[],
		rows: InviteMemberRow[],
	): void => {
		logEvent('Org Onboarding: Invite Team Members Failed', {
			teamMembers: toTeamMembers(rows),
		});
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
