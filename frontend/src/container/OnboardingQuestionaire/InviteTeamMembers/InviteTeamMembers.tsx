import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { Button } from '@signozhq/button';
import { Callout } from '@signozhq/callout';
import { Input } from '@signozhq/input';
import { Select, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import inviteUsers from 'api/v1/invite/bulk/create';
import AuthError from 'components/AuthError/AuthError';
import { useNotifications } from 'hooks/useNotifications';
import { cloneDeep, debounce, isEmpty } from 'lodash-es';
import {
	ArrowRight,
	ChevronDown,
	CircleAlert,
	Loader2,
	Plus,
	Trash2,
} from 'lucide-react';
import APIError from 'types/api/error';
import { v4 as uuid } from 'uuid';

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
	const [hasInvalidRoles, setHasInvalidRoles] = useState<boolean>(false);
	const [inviteError, setInviteError] = useState<APIError | null>(null);
	const { notifications } = useNotifications();

	const defaultTeamMember: TeamMember = {
		email: '',
		role: '',
		name: '',
		frontendBaseUrl: window.location.origin,
		id: '',
	};

	useEffect(() => {
		if (isEmpty(teamMembers)) {
			const initialTeamMembers = Array.from({ length: 3 }, () => ({
				...defaultTeamMember,
				id: uuid(),
			}));

			setTeamMembersToInvite(initialTeamMembers);
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
		let hasEmailErrors = false;
		let hasRoleErrors = false;

		const updatedEmailValidity: Record<string, boolean> = {};

		teamMembersToInvite?.forEach((member) => {
			const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email);
			const roleValid = Boolean(member.role && member.role.trim() !== '');

			if (!emailValid || !member.email) {
				isValid = false;
				hasEmailErrors = true;
			}
			if (!roleValid) {
				isValid = false;
				hasRoleErrors = true;
			}

			if (member.id) {
				updatedEmailValidity[member.id] = emailValid;
			}
		});

		setEmailValidity(updatedEmailValidity);
		setHasInvalidEmails(hasEmailErrors);
		setHasInvalidRoles(hasRoleErrors);

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
			setHasInvalidRoles(false);
			setInviteError(null);
			sendInvites({
				invites: teamMembersToInvite || [],
			});
		}
	};

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const debouncedValidateEmail = useCallback(
		debounce((email: string, memberId: string, updatedMembers: TeamMember[]) => {
			const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
			setEmailValidity((prev) => ({ ...prev, [memberId]: isValid }));

			// Clear hasInvalidEmails only when ALL emails are valid
			if (hasInvalidEmails) {
				const allEmailsValid = updatedMembers.every(
					(m) => m.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email),
				);
				if (allEmailsValid) {
					setHasInvalidEmails(false);
				}
			}
		}, 500),
		[hasInvalidEmails],
	);

	const handleEmailChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>, member: TeamMember): void => {
			const { value } = e.target;
			const updatedMembers = cloneDeep(teamMembersToInvite || []);

			const memberToUpdate = updatedMembers.find((m) => m.id === member.id);
			if (memberToUpdate && member.id) {
				memberToUpdate.email = value;
				setTeamMembersToInvite(updatedMembers);
				debouncedValidateEmail(value, member.id, updatedMembers);
				// Clear API error when user starts typing
				if (inviteError) {
					setInviteError(null);
				}
			}
		},
		[debouncedValidateEmail, inviteError, teamMembersToInvite],
	);

	const createEmailChangeHandler = useCallback(
		(member: TeamMember) => (e: React.ChangeEvent<HTMLInputElement>): void => {
			handleEmailChange(e, member);
		},
		[handleEmailChange],
	);

	const handleRoleChange = (role: string, member: TeamMember): void => {
		const updatedMembers = cloneDeep(teamMembersToInvite || []);
		const memberToUpdate = updatedMembers.find((m) => m.id === member.id);
		if (memberToUpdate && member.id) {
			memberToUpdate.role = role;
			setTeamMembersToInvite(updatedMembers);

			// Clear errors when user selects a role
			if (hasInvalidRoles) {
				// Check if all roles are now valid
				const allRolesValid = updatedMembers.every(
					(m) => m.role && m.role.trim() !== '',
				);
				if (allRolesValid) {
					setHasInvalidRoles(false);
				}
			}
			if (inviteError) {
				setInviteError(null);
			}
		}
	};

	const getValidationErrorMessage = (): string => {
		if (hasInvalidEmails && hasInvalidRoles) {
			return 'Please enter valid emails and select roles for all team members';
		}
		if (hasInvalidEmails) {
			return 'Please enter valid emails for all team members';
		}
		return 'Please select roles for all team members';
	};

	const handleDoLater = (): void => {
		logEvent('Org Onboarding: Clicked Do Later', {
			currentPageID: 4,
		});

		onNext();
	};

	const isButtonDisabled = isSendingInvites || isLoading;

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
												id={`email-input-${member.id}`}
												name={`email-input-${member.id}`}
												required
												autoComplete="off"
												className="team-member-email-input"
												onChange={createEmailChangeHandler(member)}
											/>
											{member.id &&
												emailValidity[member.id] === false &&
												member.email.trim() !== '' && (
													<Typography.Text className="email-error-message">
														Invalid email address
													</Typography.Text>
												)}
										</div>
										<div className="team-member-cell role-cell">
											<Select
												value={member.role || undefined}
												onChange={(value): void => handleRoleChange(value, member)}
												className="team-member-role-select"
												placeholder="Select roles"
												suffixIcon={<ChevronDown size={14} />}
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
													<Trash2 size={12} />
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
									prefixIcon={<Plus size={12} />}
									onClick={handleAddTeamMember}
								>
									Add another
								</Button>
							</div>
						</div>
					</div>
				</div>

				{(hasInvalidEmails || hasInvalidRoles) && (
					<Callout
						type="error"
						size="small"
						showIcon
						icon={<CircleAlert size={12} />}
						className="invite-team-members-error-callout"
						description={getValidationErrorMessage()}
					/>
				)}

				{inviteError && !hasInvalidEmails && !hasInvalidRoles && (
					<AuthError error={inviteError} />
				)}

				<div className="onboarding-buttons-container">
					<Button
						variant="solid"
						color="primary"
						className={`onboarding-next-button ${isButtonDisabled ? 'disabled' : ''}`}
						onClick={handleNext}
						disabled={isButtonDisabled}
						suffixIcon={
							isButtonDisabled ? (
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
						disabled={isButtonDisabled}
					>
						I&apos;ll do this later
					</Button>
				</div>
			</div>
		</div>
	);
}

export default InviteTeamMembers;
