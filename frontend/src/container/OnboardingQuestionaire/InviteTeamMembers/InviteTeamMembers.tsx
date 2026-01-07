import './InviteTeamMembers.styles.scss';

import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { Color } from '@signozhq/design-tokens';
import { Input } from '@signozhq/input';
import { Select, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import inviteUsers from 'api/v1/invite/bulk/create';
import { useNotifications } from 'hooks/useNotifications';
import { cloneDeep, debounce, isEmpty } from 'lodash-es';
import { ArrowRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import APIError from 'types/api/error';
import { v4 as uuid } from 'uuid';

interface TeamMember {
	email: string;
	role: string;
	name: string;
	frontendBaseUrl: string;
	id: string;
}

interface InviteTeamMembersProps {
	isLoading: boolean;
	teamMembers: TeamMember[] | null;
	setTeamMembers: (teamMembers: TeamMember[]) => void;
	onNext: () => void;
}

function InviteTeamMembers({
	isLoading,
	teamMembers,
	setTeamMembers,
	onNext,
}: InviteTeamMembersProps): JSX.Element {
	const [teamMembersToInvite, setTeamMembersToInvite] = useState<
		TeamMember[] | null
	>(teamMembers);
	const [emailValidity, setEmailValidity] = useState<Record<string, boolean>>(
		{},
	);
	const [hasInvalidEmails, setHasInvalidEmails] = useState<boolean>(false);
	const [inviteError, setInviteError] = useState<APIError | null>(null);
	const { notifications } = useNotifications();

	const defaultTeamMember: TeamMember = {
		email: '',
		role: 'EDITOR',
		name: '',
		frontendBaseUrl: window.location.origin,
		id: '',
	};

	useEffect(() => {
		if (isEmpty(teamMembers)) {
			const teamMember = {
				...defaultTeamMember,
				id: uuid(),
			};

			setTeamMembersToInvite([teamMember]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [teamMembers]);

	const handleAddTeamMember = (): void => {
		const newTeamMember = {
			...defaultTeamMember,
			id: uuid(),
		};
		setTeamMembersToInvite((prev) => [...(prev || []), newTeamMember]);
	};

	const handleRemoveTeamMember = (id: string): void => {
		setTeamMembersToInvite((prev) => (prev || []).filter((m) => m.id !== id));
	};

	// Validation function to check all users
	const validateAllUsers = (): boolean => {
		let isValid = true;

		const updatedValidity: Record<string, boolean> = {};

		teamMembersToInvite?.forEach((member) => {
			const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email);
			if (!emailValid || !member.email) {
				isValid = false;
				setHasInvalidEmails(true);
			}
			if (member.id) {
				updatedValidity[member.id] = emailValid;
			}
		});

		setEmailValidity(updatedValidity);

		return isValid;
	};

	const handleInviteUsersSuccess = (): void => {
		logEvent('Org Onboarding: Invite Team Members Success', {
			teamMembers: teamMembersToInvite,
		});
		notifications.success({
			message: 'Invites sent successfully!',
		});
		setTimeout(() => {
			onNext();
		}, 1000);
	};

	const { mutate: sendInvites, isLoading: isSendingInvites } = useMutation(
		inviteUsers,
		{
			onSuccess: (): void => {
				handleInviteUsersSuccess();
			},
			onError: (error: APIError): void => {
				logEvent('Org Onboarding: Invite Team Members Failed', {
					teamMembers: teamMembersToInvite,
				});
				setInviteError(error);
			},
		},
	);

	const handleNext = (): void => {
		if (validateAllUsers()) {
			setTeamMembers(teamMembersToInvite || []);
			setHasInvalidEmails(false);
			setInviteError(null);
			sendInvites({
				invites: teamMembersToInvite || [],
			});
		}
	};

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const debouncedValidateEmail = useCallback(
		debounce((email: string, memberId: string) => {
			const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
			setEmailValidity((prev) => ({ ...prev, [memberId]: isValid }));
		}, 500),
		[],
	);

	const handleEmailChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		member: TeamMember,
	): void => {
		const { value } = e.target;
		const updatedMembers = cloneDeep(teamMembersToInvite || []);

		const memberToUpdate = updatedMembers.find((m) => m.id === member.id);
		if (memberToUpdate && member.id) {
			memberToUpdate.email = value;
			setTeamMembersToInvite(updatedMembers);
			debouncedValidateEmail(value, member.id);
			// Clear errors when user starts typing
			if (hasInvalidEmails) {
				setHasInvalidEmails(false);
			}
			if (inviteError) {
				setInviteError(null);
			}
		}
	};

	const handleRoleChange = (role: string, member: TeamMember): void => {
		const updatedMembers = cloneDeep(teamMembersToInvite || []);
		const memberToUpdate = updatedMembers.find((m) => m.id === member.id);
		if (memberToUpdate) {
			memberToUpdate.role = role;
			setTeamMembersToInvite(updatedMembers);
		}
	};

	const handleDoLater = (): void => {
		logEvent('Org Onboarding: Clicked Do Later', {
			currentPageID: 4,
		});

		onNext();
	};

	return (
		<div className="questions-container">
			<div className="onboarding-header-section">
				<div className="onboarding-header-icon">
					<img src="/svgs/barber-pool.svg" alt="SigNoz" width="32" height="32" />
				</div>
				<Typography.Title level={4} className="onboarding-header-title">
					Invite your team
				</Typography.Title>
				<Typography.Paragraph className="onboarding-header-subtitle">
					SigNoz is a lot more useful with collaborators on board.
				</Typography.Paragraph>
			</div>

			<div className="questions-form-container">
				<div className="questions-form invite-team-members-form">
					<div className="form-group">
						<div className="question-label">
							Invite your team to the SigNoz workspace
						</div>

						<div className="invite-team-members-table">
							<div className="invite-team-members-table-header">
								<div className="table-header-cell email-header">Email address</div>
								<div className="table-header-cell role-header">Roles</div>
								<div className="table-header-cell action-header" />
							</div>

							<div className="invite-team-members-container">
								{teamMembersToInvite?.map((member) => (
									<div className="team-member-row" key={member.id}>
										<div className="team-member-cell email-cell">
											<Input
												placeholder="e.g. john@signoz.io"
												value={member.email}
												type="email"
												required
												autoComplete="off"
												className="team-member-email-input"
												onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
													handleEmailChange(e, member)
												}
											/>
											{member.id &&
												emailValidity[member.id] === false &&
												member.email.trim() !== '' && (
													<Typography.Text
														className="email-error-message"
														style={{ color: Color.BG_CHERRY_500 }}
													>
														Invalid email address
													</Typography.Text>
												)}
										</div>
										<div className="team-member-cell role-cell">
											<Select
												value={member.role}
												onChange={(value): void => handleRoleChange(value, member)}
												className="team-member-role-select"
												placeholder="Select roles"
											>
												<Select.Option value="VIEWER">Viewer</Select.Option>
												<Select.Option value="EDITOR">Editor</Select.Option>
												<Select.Option value="ADMIN">Admin</Select.Option>
											</Select>
										</div>
										<div className="team-member-cell action-cell">
											{teamMembersToInvite && teamMembersToInvite.length > 1 && (
												<Button
													variant="ghost"
													color="secondary"
													className="remove-team-member-button"
													onClick={(): void => handleRemoveTeamMember(member.id)}
													aria-label="Remove team member"
												>
													<Trash2 size={14} />
												</Button>
											)}
										</div>
									</div>
								))}
							</div>

							<div className="invite-team-members-add-another-member-container">
								<Button
									variant="dashed"
									color="secondary"
									className="add-another-member-button"
									prefixIcon={<Plus size={14} />}
									onClick={handleAddTeamMember}
								>
									Add another
								</Button>
							</div>
						</div>
					</div>
				</div>

				{hasInvalidEmails && (
					<Callout
						type="error"
						size="small"
						showIcon
						description="Please enter valid emails for all team members"
					/>
				)}

				{inviteError && !hasInvalidEmails && (
					<Callout
						type="error"
						size="small"
						showIcon
						message={inviteError.getErrorCode() || undefined}
						description={inviteError.getErrorMessage() || 'Something went wrong'}
					/>
				)}

				<div className="onboarding-buttons-container">
					<Button
						variant="solid"
						color="primary"
						className={`onboarding-next-button ${
							isSendingInvites || isLoading ? 'disabled' : ''
						}`}
						onClick={handleNext}
						disabled={isSendingInvites || isLoading}
						suffixIcon={
							isSendingInvites || isLoading ? (
								<Loader2 className="animate-spin" size={12} />
							) : (
								<ArrowRight size={12} />
							)
						}
					>
						Complete
					</Button>
					<Button
						variant="ghost"
						color="secondary"
						className="onboarding-do-later-button"
						onClick={handleDoLater}
						disabled={isSendingInvites || isLoading}
					>
						I&apos;ll do this later
					</Button>
				</div>
			</div>
		</div>
	);
}

export default InviteTeamMembers;
